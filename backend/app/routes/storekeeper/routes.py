from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.extensions import db
from app.models import (
    User, Demand, InventoryItem, RMCheckRequest,
    DispatchRecord, Notification, Status
)

sk_bp = Blueprint('storekeeper', __name__)


# ─────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────
def get_sk_user():
    username = get_jwt_identity()
    return User.query.filter_by(username=username).first()


def require_sk(fn):
    """Decorator: ensure caller is Store_Keeper or Admin."""
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_sk_user()
        if not user or user.role not in ('Store_Keeper', 'Admin'):
            return jsonify({"success": False, "message": "Access denied"}), 403
        return fn(*args, **kwargs)
    return wrapper


# ─────────────────────────────────────────────────────────
# RM ACCEPTANCE QUEUE
# Store Keeper reviews RMCheckRequests submitted by PPC Planner
# ─────────────────────────────────────────────────────────

@sk_bp.route('/rm-requests', methods=['GET'])
@jwt_required()
@require_sk
def get_rm_queue():
    """List all RM requests pending SK action, plus recently actioned."""
    status_filter = request.args.get('status')  # SUBMITTED | ACCEPTED | REJECTED | all
    query = RMCheckRequest.query
    if status_filter and status_filter != 'all':
        query = query.filter_by(status=status_filter)
    else:
        # Default: show SUBMITTED (pending) first
        query = query.order_by(
            db.case({'SUBMITTED': 0}, value=RMCheckRequest.status, else_=1),
            RMCheckRequest.submitted_at.desc()
        )
    reqs = query.order_by(RMCheckRequest.created_at.desc()).all()
    return jsonify({"success": True, "data": [r.to_dict() for r in reqs]})


@sk_bp.route('/rm-requests/<int:rm_id>', methods=['GET'])
@jwt_required()
@require_sk
def get_rm_request(rm_id):
    rm = RMCheckRequest.query.get_or_404(rm_id)
    return jsonify({"success": True, "data": rm.to_dict()})


@sk_bp.route('/rm-requests/<int:rm_id>/accept', methods=['POST'])
@jwt_required()
@require_sk
def accept_rm_request(rm_id):
    """Store Keeper accepts RM request — sends RM to plant."""
    user = get_sk_user()
    rm = RMCheckRequest.query.get_or_404(rm_id)

    if rm.status not in ('SUBMITTED', 'PENDING'):
        return jsonify({"success": False, "message": f"Cannot accept — current status: {rm.status}"}), 400

    data = request.json or {}
    rm.status = 'ACCEPTED'
    rm.store_keeper_id = user.id
    rm.sk_notes = data.get('sk_notes')
    rm.sk_actioned_at = datetime.utcnow()

    # Update InventoryItem rm_status
    item = rm.inventory_item
    if item:
        item.rm_status = 'RM_ACCEPTED'

    db.session.flush()

    # Notify Supervisor(s) assigned to the demand's line
    supervisors = []
    if rm.demand_id:
        demand = Demand.query.get(rm.demand_id)
        if demand and demand.model and demand.model.supervisor_id:
            supervisors.append(demand.model.supervisor_id)

    # If no specific supervisor, notify all active supervisors
    if not supervisors:
        sups = User.query.filter_by(role='Supervisor', is_active=True).all()
        supervisors = [s.id for s in sups]

    for sup_id in supervisors:
        Notification.send(
            user_id=sup_id,
            title="RM Material Accepted — Ready for Production",
            message=f"Store Keeper {user.name} accepted RM for part {item.sap_part_number if item else 'N/A'}. Raw material is at plant.",
            notification_type='RM_ACCEPTED',
            demand_id=rm.demand_id,
            rm_request_id=rm.id
        )

    # Notify PPC Planner
    if rm.ppc_planner_id:
        Notification.send(
            user_id=rm.ppc_planner_id,
            title="RM Sheet Accepted",
            message=f"Your RM submission ({rm.formatted_id}) was accepted by Store Keeper {user.name}.",
            notification_type='RM_ACCEPTED',
            demand_id=rm.demand_id,
            rm_request_id=rm.id
        )

    db.session.commit()
    return jsonify({"success": True, "data": rm.to_dict()})


@sk_bp.route('/rm-requests/<int:rm_id>/reject', methods=['POST'])
@jwt_required()
@require_sk
def reject_rm_request(rm_id):
    """Store Keeper rejects RM request with a reason."""
    user = get_sk_user()
    rm = RMCheckRequest.query.get_or_404(rm_id)

    if rm.status not in ('SUBMITTED', 'PENDING'):
        return jsonify({"success": False, "message": f"Cannot reject — current status: {rm.status}"}), 400

    data = request.json or {}
    reason = data.get('rejection_reason', '').strip()
    if not reason:
        return jsonify({"success": False, "message": "Rejection reason is required"}), 400

    rm.status = 'REJECTED'
    rm.store_keeper_id = user.id
    rm.rejection_reason = reason
    rm.sk_notes = data.get('sk_notes')
    rm.sk_actioned_at = datetime.utcnow()

    # Update InventoryItem rm_status
    if rm.inventory_item:
        rm.inventory_item.rm_status = 'RM_REJECTED'

    # Notify PPC Planner
    if rm.ppc_planner_id:
        Notification.send(
            user_id=rm.ppc_planner_id,
            title="RM Sheet Rejected",
            message=f"Your RM submission ({rm.formatted_id}) was rejected. Reason: {reason}",
            notification_type='RM_REJECTED',
            demand_id=rm.demand_id,
            rm_request_id=rm.id
        )

    db.session.commit()
    return jsonify({"success": True, "data": rm.to_dict()})


# ─────────────────────────────────────────────────────────
# DISPATCH MANAGEMENT
# Store Keeper dispatches completed production to client
# ─────────────────────────────────────────────────────────

@sk_bp.route('/dispatch-queue', methods=['GET'])
@jwt_required()
@require_sk
def get_dispatch_queue():
    """
    Returns demands/inventory items that are PRODUCTION_DONE and ready for dispatch.
    """
    # Get all inventory items that are PRODUCTION_DONE (not yet dispatched)
    items = InventoryItem.query.filter_by(status='PRODUCTION_DONE').all()

    # Group by demand
    demand_map = {}
    for item in items:
        did = item.demand_id
        if did not in demand_map:
            demand = Demand.query.get(did) if did else None
            demand_map[did] = {
                "demand": demand.to_dict() if demand else None,
                "parts": []
            }
        demand_map[did]["parts"].append(item.to_dict())

    return jsonify({"success": True, "data": list(demand_map.values())})


@sk_bp.route('/dispatches', methods=['GET'])
@jwt_required()
@require_sk
def get_dispatches():
    """List all dispatch records."""
    dispatches = DispatchRecord.query.order_by(DispatchRecord.created_at.desc()).all()
    return jsonify({"success": True, "data": [d.to_dict() for d in dispatches]})


@sk_bp.route('/dispatches', methods=['POST'])
@jwt_required()
@require_sk
def create_dispatch():
    """
    Store Keeper dispatches completed parts to client.
    Updates InventoryItem status to DISPATCHED.
    Updates Demand status to DISPATCHED.
    """
    user = get_sk_user()
    data = request.json or {}

    demand_id = data.get('demand_id')
    inventory_item_ids = data.get('inventory_item_ids', [])

    if not demand_id:
        return jsonify({"success": False, "message": "demand_id is required"}), 400

    # Generate dispatch formatted_id
    count = DispatchRecord.query.count() + 1
    formatted_id = f"DSP-{count:04d}"
    while DispatchRecord.query.filter_by(formatted_id=formatted_id).first():
        count += 1
        formatted_id = f"DSP-{count:04d}"

    dispatch = DispatchRecord(
        formatted_id=formatted_id,
        demand_id=demand_id,
        store_keeper_id=user.id,
        dispatch_date=datetime.utcnow().date(),
        quantity_dispatched=data.get('quantity_dispatched', 0),
        vehicle_count=data.get('vehicle_count', 0),
        client_name=data.get('client_name', ''),
        challan_number=data.get('challan_number'),
        dispatch_notes=data.get('dispatch_notes'),
        status='DISPATCHED',
    )
    db.session.add(dispatch)

    # Mark specified inventory items as DISPATCHED
    for item_id in inventory_item_ids:
        item = InventoryItem.query.get(item_id)
        if item:
            item.status = 'DISPATCHED'
            dispatch.inventory_item_id = item_id  # Link last item (or use separate table for multi)

    # Mark demand as DISPATCHED
    demand = Demand.query.get(demand_id)
    if demand:
        demand.status = 'DISPATCHED'

    db.session.commit()

    # Notify Admin & PPC Planners
    admins = User.query.filter(User.role.in_(['Admin', 'PPC_Planner']), User.is_active == True).all()
    for admin in admins:
        Notification.send(
            user_id=admin.id,
            title="Parts Dispatched to Client",
            message=f"Store Keeper {user.name} dispatched {dispatch.quantity_dispatched} parts to {dispatch.client_name}. Challan: {dispatch.challan_number or 'N/A'}",
            notification_type='DISPATCHED',
            demand_id=demand_id,
            dispatch_id=dispatch.id
        )
    db.session.commit()

    return jsonify({"success": True, "data": dispatch.to_dict()}), 201


@sk_bp.route('/dispatches/<int:dispatch_id>', methods=['GET'])
@jwt_required()
@require_sk
def get_dispatch(dispatch_id):
    dispatch = DispatchRecord.query.get_or_404(dispatch_id)
    return jsonify({"success": True, "data": dispatch.to_dict()})


# ─────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────

@sk_bp.route('/notifications', methods=['GET'])
@jwt_required()
@require_sk
def get_notifications():
    user = get_sk_user()
    notifs = Notification.query.filter_by(user_id=user.id).order_by(
        Notification.created_at.desc()
    ).limit(50).all()
    unread = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({"success": True, "data": [n.to_dict() for n in notifs], "unread_count": unread})


@sk_bp.route('/notifications/<int:notif_id>/read', methods=['POST'])
@jwt_required()
@require_sk
def mark_read(notif_id):
    user = get_sk_user()
    notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first_or_404()
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True})


@sk_bp.route('/notifications/mark-all-read', methods=['POST'])
@jwt_required()
@require_sk
def mark_all_read():
    user = get_sk_user()
    Notification.query.filter_by(user_id=user.id, is_read=False).update(
        {"is_read": True, "read_at": datetime.utcnow()}
    )
    db.session.commit()
    return jsonify({"success": True})
