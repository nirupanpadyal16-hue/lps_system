# admin/routes.py – Blueprint for admin‑only endpoints (user management)
"""Admin routes handle CRUD operations for user accounts.
These endpoints are protected with JWT and are intended for users with the
"Admin" role. The blueprint is registered in ``wsgi.py`` under the ``/api``
prefix.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, ProductionLine, CarModel, Demand, db, DailyWorkStatus, DailyProductionLog, EmailRequest, Status
from app.services.db_service import IdentityDBService
from app.middleware.auth_middleware import role_required
from app.utils.audit_logger import log_audit
import time as time_module
import datetime

admin_bp = Blueprint('admin', __name__)

# ... (paginate_query, get_admin_summary, get_users, create_user, update_user, delete_user remain same)

@admin_bp.route('/identity/staff', methods=['GET'])
@jwt_required()
@role_required(['Admin', 'Manager', 'Supervisor'])
def get_staff():
    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter(User.role.ilike(role))
    else:
        query = query.filter(User.role.in_(['Supervisor', 'DEO']))
    
    staff = query.order_by(User.name.asc()).all()
    return jsonify({
        "success": True,
        "data": [s.to_dict() for s in staff]
    })

# ---------------------------------------------------------------------------
# Production Line Endpoints
# ---------------------------------------------------------------------------
@admin_bp.route('/lines', methods=['GET'])
@jwt_required()
@role_required(['Admin', 'Manager'])
def get_lines():
    lines = ProductionLine.query.all()
    return jsonify({
        "success": True,
        "data": [line.to_dict() for line in lines]
    })

@admin_bp.route('/lines', methods=['POST'])
@jwt_required()
@role_required(['Admin'])
def create_line():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"success": False, "message": "Line name is required"}), 400
    
    new_line = ProductionLine(
        name=data['name'],
        description=data.get('description', ''),
        is_active=data.get('isActive', True)
    )
    db.session.add(new_line)
    db.session.commit()
    log_audit("CREATE_LINE")
    return jsonify({"success": True, "message": "Production line created", "data": new_line.to_dict()}), 201

@admin_bp.route('/lines/<int:line_id>', methods=['PUT'])
@jwt_required()
@role_required(['Admin'])
def update_line(line_id):
    line = ProductionLine.query.get(line_id)
    if not line:
        return jsonify({"success": False, "message": "Line not found"}), 404
    
    data = request.json
    if 'name' in data: line.name = data['name']
    if 'description' in data: line.description = data['description']
    if 'isActive' in data: line.is_active = data['isActive']
    
    db.session.commit()
    log_audit("UPDATE_LINE")
    return jsonify({"success": True, "message": "Line updated", "data": line.to_dict()})

@admin_bp.route('/lines/<int:line_id>', methods=['DELETE'])
@jwt_required()
@role_required(['Admin'])
def delete_line(line_id):
    line = ProductionLine.query.get(line_id)
    if not line:
        return jsonify({"success": False, "message": "Line not found"}), 404
    
    db.session.delete(line)
    db.session.commit()
    log_audit("DELETE_LINE")
    return jsonify({"success": True, "message": "Line deleted"})

# ---------------------------------------------------------------------------
@admin_bp.route('/assignments', methods=['GET'])
@jwt_required()
@role_required(['Admin'])
def get_assignments():
    # Show all registered car models
    models = CarModel.query.order_by(CarModel.name.asc()).all()
    return jsonify({
        "success": True,
        "data": [m.to_dict() for m in models]
    })

@admin_bp.route('/assignments/<int:model_id>', methods=['PUT', 'PATCH'])
@jwt_required()
@role_required(['Admin', 'Supervisor'])
def update_assignment(model_id):
    model = CarModel.query.get(model_id)
    if not model:
        return jsonify({"success": False, "message": "Car Model not found"}), 404
    
    data = request.json
    if 'line_id' in data: model.production_line_id = data.get('line_id')
    if 'supervisor_id' in data: model.supervisor_id = data.get('supervisor_id')
    if 'assigned_deo_id' in data: model.assigned_deo_id = data.get('assigned_deo_id')
    if 'name' in data: model.name = data['name']
    if 'model_code' in data: model.model_code = data['model_code']
    if 'type' in data: model.type = data['type']
    
    db.session.commit()
    log_audit("UPDATE_ASSIGNMENT")
    return jsonify({"success": True, "message": f"Assignments updated for {model.name}", "data": model.to_dict()})

# ---------------------------------------------------------------------------
# Master Data & Models (from Production BP)
# ---------------------------------------------------------------------------
@admin_bp.route('/models', methods=['GET'])
@jwt_required()
@role_required(['Admin', 'Supervisor', 'Manager', 'DEO'])
def get_models():
    # Return unique model names
    from sqlalchemy import func
    latest_ids = db.session.query(func.max(CarModel.id)).group_by(CarModel.name).all()
    latest_ids = [id_tuple[0] for id_tuple in latest_ids]
    models = CarModel.query.filter(CarModel.id.in_(latest_ids)).order_by(CarModel.name.asc()).all()
    return jsonify({"success": True, "data": [m.to_dict() for m in models]})

@admin_bp.route('/models', methods=['POST'])
@jwt_required()
@role_required(['Admin', 'Manager'])
def create_model_master():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"success": False, "message": "Name is required"}), 400
    
    new_model = CarModel(
        name=data['name'],
        model_code=data.get('model_code'),
        type=data.get('type', 'Standard')
    )
    db.session.add(new_model)
    db.session.commit()
    log_audit("CREATE_MODEL_MASTER")
    return jsonify({"success": True, "message": "Model created", "data": new_model.to_dict()}), 201

# ---------------------------------------------------------------------------
# Demands / Orders (from Production BP)
# ---------------------------------------------------------------------------
@admin_bp.route('/demands', methods=['GET'])
@jwt_required()
@role_required(['Admin', 'Supervisor', 'Manager', 'DEO'])
def get_demands():
    manager_filter = request.args.get('manager')
    query = Demand.query
    if manager_filter:
        query = query.filter(Demand.manager.ilike(manager_filter))
    demands = query.order_by(Demand.id.desc()).all()
    return jsonify({"success": True, "data": [d.to_dict() for d in demands]})

@admin_bp.route('/demands', methods=['POST'])
@jwt_required()
@role_required(['Admin', 'Supervisor', 'Manager'])
def create_demand():
    data = request.json
    model_name = data.get('model_name') or data.get('model_id')
    if not data or not model_name or not data.get('quantity'):
        return jsonify({"success": False, "message": "Model and Quantity are required"}), 400
    
    # Generate unique DEM-ID
    from sqlalchemy import func
    max_id = db.session.query(func.max(Demand.id)).scalar() or 0
    formatted_id = data.get('formatted_id', f"DEM-{(max_id + 1):03d}")
    
    # Clone model for independent assignment lifecycle
    model_name_str = str(model_name).upper().strip()
    new_model = CarModel(
        name=model_name_str,
        model_code=f"{model_name_str[:3]}-{str(int(time_module.time()))[-4:]}",
        type='Standard',
        status='PENDING'
    )
    db.session.add(new_model)
    db.session.flush()

    new_demand = Demand(
        formatted_id=formatted_id,
        model_id=new_model.id,
        model_name=model_name_str,
        quantity=data['quantity'],
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
        line=data.get('line'),
        manager=data.get('manager'),
        customer=data.get('customer'),
        company=data.get('company'),
        status='PENDING',
        created_at=datetime.datetime.now()
    )
    db.session.add(new_demand)
    db.session.commit()
    log_audit("CREATE_DEMAND_ADMIN")
    return jsonify({"success": True, "message": "Demand created", "data": new_demand.to_dict()}), 201

@admin_bp.route('/demands/<int:id>', methods=['GET', 'PUT', 'PATCH'])
@jwt_required()
@role_required(['Admin', 'Supervisor', 'Manager'])
def handle_demand_by_id(id):
    demand = Demand.query.get(id)
    if not demand:
        return jsonify({"success": False, "message": "Demand not found"}), 404
    
    if request.method == 'GET':
        return jsonify({"success": True, "data": demand.to_dict()})
    
    data = request.json or {}
    if 'quantity' in data: demand.quantity = data['quantity']
    if 'status' in data: demand.status = data['status']
    if 'line' in data: demand.line = data['line']
    if 'manager' in data: demand.manager = data['manager']
    if 'customer' in data: demand.customer = data['customer']
    if 'company' in data: demand.company = data['company']
    if 'start_date' in data: demand.start_date = data['start_date']
    if 'end_date' in data: demand.end_date = data['end_date']
    
    db.session.commit()
    log_audit("UPDATE_DEMAND_ADMIN")
    return jsonify({"success": True, "message": "Demand updated", "data": demand.to_dict()})

@admin_bp.route('/demands/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['Admin'])
def delete_demand(id):
    demand = Demand.query.get(id)
    if not demand:
        return jsonify({"success": False, "message": "Demand not found"}), 404
    
    model_id = demand.model_id
    # Cleanup associated logs, work status, and unique model clone
    DailyProductionLog.query.filter_by(demand_id=id).delete()
    
    if model_id:
        # Prevent foreign key constraint errors by cleaning up daily status records
        DailyWorkStatus.query.filter_by(car_model_id=model_id).delete()
        
    db.session.delete(demand)
    
    if model_id:
        model = CarModel.query.get(model_id)
        if model: 
            db.session.delete(model)
    
    db.session.commit()
    log_audit("DELETE_DEMAND_ADMIN")
    return jsonify({"success": True, "message": "Demand deleted successfully"})

# Helper for pagination (reuse from routes if needed)
def paginate_query(query, default_limit=50, max_limit=200):
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', default_limit))
        limit = min(limit, max_limit)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid pagination parameters"}), 400
    items = query.offset((page - 1) * limit).limit(limit).all()
    total = query.count()
    return items, total, page, limit

@admin_bp.route('/summary', methods=['GET'])
@jwt_required()
@role_required(['Admin'])
def get_admin_summary():
    from app.models import DailyWorkStatus, DailyProductionLog, CarModel, ProductionLine
    from sqlalchemy import func
    import datetime
    
    # Get today's production data from unified DailyWorkStatus
    today = datetime.date.today()
    work_entries = DailyWorkStatus.query.filter(DailyWorkStatus.date == today).all()
    
    total_actual = sum(p.actual_qty for p in work_entries)
    total_planned = sum(p.planned_qty for p in work_entries)
    
    # Calculate OEE (actual/planned ratio)
    oee = "0.0%"
    if total_planned > 0:
        oee_val = (total_actual / total_planned) * 100
        oee = f"{oee_val:.1f}%"
    elif total_actual > 0:
        oee = "100.0%"

    # 5. General Stats
    stats = {
        "active_lines": ProductionLine.query.filter_by(is_active=True).count(),
        "pending_reviews": DailyProductionLog.query.filter_by(status='PENDING').count(),
        "total_models": CarModel.query.count(),
        "active_deos": User.query.filter_by(role='DEO', is_active=True).count()
    }
        
    return jsonify({
        "success": True,
        "oee": oee,
        "production_units": str(total_actual),
        "stats": stats
    })


@admin_bp.route('/analytics/velocity', methods=['GET'])
@jwt_required()
@role_required(['Admin', 'Manager'])
def get_velocity_trend():
    from sqlalchemy import func
    import datetime
    
    # Aggregation for the last 6 months
    six_months_ago = datetime.date.today() - datetime.timedelta(days=180)
    
    # Using PostgreSQL date_trunc for monthly grouping
    results = db.session.query(
        func.date_trunc('month', DailyWorkStatus.date).label('month_date'),
        func.sum(DailyWorkStatus.actual_qty).label('actual'),
        func.sum(DailyWorkStatus.planned_qty).label('target')
    ).filter(
        DailyWorkStatus.date >= six_months_ago
    ).group_by(
        'month_date'
    ).order_by(
        'month_date'
    ).all()
    
    # Format into JAN, FEB... sequence for Recharts
    formatted_data = []
    for r in results:
        if r.month_date:
            formatted_data.append({
                "name": r.month_date.strftime('%b').upper(),
                "actual": int(r.actual or 0),
                "target": int(r.target or 0)
            })
    
    # If no historical data exists, return an empty but successful array
    # (frontend will handle fallback to ensure 'perfect' visual state)
    return jsonify({
        "success": True,
        "data": formatted_data
    })


@admin_bp.route('/production/record', methods=['POST'])
@jwt_required()
@role_required(['Admin', 'Manager'])
def record_production():
    from flask import request
    data = request.json or {}
    line_name = data.get('lineName')
    inc = data.get('increment', 1)
    
    # Simple logic to find today's work status for this line
    # (In real scenario, we'd look for active assignment)
    from app.models.models import DailyWorkStatus, CarModel, ProductionLine
    
    line = ProductionLine.query.filter_by(name=line_name).first()
    if not line:
        return jsonify({"success": False, "message": "Line not found"}), 404
        
    model = CarModel.query.filter_by(production_line_id=line.id).first()
    if not model:
        return jsonify({"success": False, "message": "No model assigned to this line"}), 404
        
    today = datetime.date.today()
    status = DailyWorkStatus.query.filter_by(date=today, car_model_id=model.id).first()
    
    if not status:
        # Create today's entry if missing
        status = DailyWorkStatus(
            date=today,
            car_model_id=model.id,
            deo_id=model.assigned_deo_id or 1,
            planned_qty=100,
            actual_qty=inc,
            status='IN_PROGRESS'
        )
        db.session.add(status)
    else:
        status.actual_qty += inc
        
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"Successfully recorded {inc} units for {line_name}",
        "new_actual": status.actual_qty
    })


@admin_bp.route('/identity/users', methods=['GET'])
@jwt_required()
@role_required(['Admin'])
def get_users():
    query = User.query.order_by(User.id.desc())
    users, total, page, limit = paginate_query(query)
    data = [u.to_dict() for u in users]
    return jsonify({
        "success": True,
        "data": data,
        "meta": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        },
    })

@admin_bp.route('/identity/users', methods=['POST'])
@jwt_required()
@role_required(['Admin'])
def create_user():
    data = request.json
    if not data or not data.get('username'):
        return jsonify({"success": False, "message": "Username is required"}), 400
    existing = User.query.filter_by(username=data['username']).first()
    if existing:
        return jsonify({"success": False, "message": "Username already exists"}), 400
    new_user = User(
        username=data['username'],
        name=data.get('name', data['username']),
        password=data.get('password'),  # setter hashes automatically
        role=data.get('role'),
        shop=data.get('shop'),
        is_active=data.get('isActive', True),
    )
    db.session.add(new_user)
    db.session.commit()
    log_audit("CREATE_USER")
    return jsonify({"success": True, "message": "User created successfully", "user": new_user.to_dict()}), 201

@admin_bp.route('/identity/users/<string:username>', methods=['PUT', 'PATCH'])
@jwt_required()
@role_required(['Admin'])
def update_user(username):
    updates = request.json or {}
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Apply updates directly so the password setter (hashing) works
    if 'name' in updates:
        user.name = updates['name']
    if 'role' in updates:
        user.role = updates['role']
    if 'shop' in updates:
        user.shop = updates['shop']
    if 'isActive' in updates:
        user.is_active = updates['isActive']
    if 'password' in updates and updates['password']:
        user.password = updates['password']  # triggers the @password.setter → hashes it

    db.session.commit()
    log_audit("UPDATE_USER")
    return jsonify({"success": True, "message": f"User {username} updated", "user": user.to_dict()})

@admin_bp.route('/identity/users/<string:username>', methods=['DELETE'])
@jwt_required()
@role_required(['Admin'])
def delete_user(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    log_audit("DELETE_USER")
    db.session.delete(user)
    db.session.commit()
    return jsonify({"success": True, "message": f"User {username} deleted"})

# ---------------------------------------------------------------------------
# Order Email Tracking Endpoints
# ---------------------------------------------------------------------------

@admin_bp.route('/orders/emails/<int:id>/status', methods=['PATCH'])
@jwt_required()
@role_required(['Admin', 'Manager'])
def update_email_status(id):
    req = EmailRequest.query.get(id)
    if not req:
        return jsonify({"success": False, "message": "Order request not found"}), 404
    
    data = request.json or {}
    new_status = data.get('status')
    if new_status not in [Status.UNREAD, Status.READ, Status.REJECTED, Status.PROCESSED]:
        return jsonify({"success": False, "message": "Invalid status"}), 400
        
    req.status = new_status
    db.session.commit()
    return jsonify({"success": True, "message": f"Status updated to {new_status}", "data": req.to_dict()})

@admin_bp.route('/orders/emails/<int:id>/authorize', methods=['POST'])
@jwt_required()
@role_required(['Admin', 'Manager'])
def authorize_email_production(id):
    """Bridge a mail request to a formal Production Demand"""
    req = EmailRequest.query.get(id)
    if not req:
        return jsonify({"success": False, "message": "Order request not found"}), 404
    
    if req.status == Status.PROCESSED:
        return jsonify({"success": False, "message": "This request has already been authorized"}), 400

    data = request.json or {}
    # Validation logic same as create_demand but uses req data as base
    model_name = data.get('model_name') or req.subject # Fallback
    quantity = int(data.get('quantity') or 1)
    
    # Normalize model name
    model_name_str = str(model_name).upper().strip()
    
    # 1. Always create a NEW CarModel for each authorized email
    #    so that Demand Management and Car Models Assignment always stay in sync (1 demand = 1 car card)
    import time as time_module_inner
    new_model = CarModel(
        name=model_name_str,
        model_code=f"{model_name_str[:3]}-{str(int(time_module.time()))[-4:]}",
        type='Standard',
        status=Status.PENDING
    )
    db.session.add(new_model)
    db.session.flush()

    # 2. Always Create a Separate Demand Card (Unique DEM-ID)
    from sqlalchemy import func
    max_id = db.session.query(func.max(Demand.id)).scalar() or 0
    formatted_id = f"DEM-{(max_id + 1):03d}"
    
    new_demand = Demand(
        formatted_id=formatted_id,
        model_id=new_model.id,
        model_name=model_name_str,
        quantity=quantity,
        start_date=data.get('start_date', datetime.date.today().isoformat()),
        customer=req.sender,
        company=data.get('company'),
        status=Status.PENDING
    )
    db.session.add(new_demand)
    
    # 3. Mark Email as PROCESSED
    req.status = Status.PROCESSED
    
    db.session.commit()
    log_audit("AUTHORIZE_MAIL_PRODUCTION")
    
    return jsonify({
        "success": True, 
        "message": f"Demand {formatted_id} created for {model_name_str}.",
        "demand": new_demand.to_dict(),
        "email": req.to_dict()
    })


@admin_bp.route('/dashboard/live', methods=['GET'])
@jwt_required()
@role_required(['Admin'])
def get_dashboard_live():
    """
    Aggregated real-time dashboard endpoint.
    Accepts filter query params: model, line, supervisor, deo, time (day/week/month)
    Returns: line_status, supervisors, deos, kpis, issues
    """
    from sqlalchemy import or_, and_
    from app.models.models import DEOProductionEntry, AuditLog

    f_model = request.args.get('model', 'all')
    f_line = request.args.get('line', 'all')
    f_supervisor = request.args.get('supervisor', 'all')
    f_deo = request.args.get('deo', 'all')
    f_time = request.args.get('time', 'day')
    f_date = request.args.get('date', None)

    today = datetime.date.today()

    if f_time in ('day', 'now'):
        date_from = today
        date_to = today
    elif f_time == 'week':
        date_from = today - datetime.timedelta(days=today.weekday())
        date_to = today
    elif f_time == 'month':
        date_from = today.replace(day=1)
        date_to = today
    elif f_time == 'year':
        date_from = today.replace(month=1, day=1)
        date_to = today
    elif f_time == 'custom' and f_date:
        try:
            date_from = datetime.date.fromisoformat(f_date)
            date_to = date_from
        except ValueError:
            date_from = today
            date_to = today
    else:
        date_from = today
        date_to = today

    # Build base log query
    log_query = DailyProductionLog.query.filter(
        DailyProductionLog.date >= date_from,
        DailyProductionLog.date <= date_to
    )
    if f_model != 'all':
        log_query = log_query.filter(DailyProductionLog.model_name.ilike(f'%{f_model}%'))
    if f_deo != 'all':
        deo_user = User.query.filter(User.name.ilike(f'%{f_deo}%'), User.role == 'DEO').first()
        if deo_user:
            log_query = log_query.filter(DailyProductionLog.deo_id == deo_user.id)

    logs = log_query.order_by(DailyProductionLog.date.desc()).all()

    # LINE STATUS BOARD
    lines_data = []
    all_lines = ProductionLine.query.filter_by(is_active=True).all()
    if f_line != 'all':
        all_lines = [l for l in all_lines if f_line.lower() in l.name.lower()]

    for line in all_lines:
        model_on_line = CarModel.query.filter_by(production_line_id=line.id).order_by(CarModel.id.desc()).first()
        if not model_on_line:
            lines_data.append({
                "line_name": line.name, "model": "—", "model_code": "",
                "deo_name": "—", "supervisor_name": "—", "log_status": "IDLE",
                "last_updated": None, "entries_count": 0, "pending_reviews": 0,
                "today_actual": 0, "today_planned": 0
            })
            continue

        if f_model != 'all' and f_model.lower() not in model_on_line.name.lower():
            continue

        deo_name = model_on_line.deo.name if model_on_line.deo else "—"
        sup_name = model_on_line.supervisor.name if model_on_line.supervisor else "—"

        if f_supervisor != 'all' and f_supervisor.lower() not in sup_name.lower():
            continue
        if f_deo != 'all' and f_deo.lower() not in deo_name.lower():
            continue

        model_logs = [l for l in logs if l.car_model_id == model_on_line.id]
        latest_log = model_logs[0] if model_logs else None
        entries_count = len(latest_log.entries) if latest_log else 0
        pending = sum(1 for e in latest_log.entries if e.status in ('PENDING', 'SUBMITTED')) if latest_log else 0
        ws = DailyWorkStatus.query.filter_by(date=today, car_model_id=model_on_line.id).first()

        lines_data.append({
            "line_name": line.name,
            "model": model_on_line.name,
            "model_code": model_on_line.model_code or "",
            "deo_name": deo_name,
            "supervisor_name": sup_name,
            "log_status": latest_log.status if latest_log else "IDLE",
            "last_updated": latest_log.created_at.isoformat() if latest_log and latest_log.created_at else None,
            "entries_count": entries_count,
            "pending_reviews": pending,
            "today_actual": ws.actual_qty if ws else 0,
            "today_planned": ws.planned_qty if ws else 0,
        })

    # SUPERVISOR ACTIVITY
    supervisors_data = []
    sup_users = User.query.filter(User.role.in_(['Supervisor']), User.is_active == True).all()
    for sup in sup_users:
        if f_supervisor != 'all' and f_supervisor.lower() not in sup.name.lower():
            continue
        sup_model_ids = [m.id for m in CarModel.query.filter_by(supervisor_id=sup.id).all()]
        if sup_model_ids:
            sup_logs = DailyProductionLog.query.filter(
                DailyProductionLog.car_model_id.in_(sup_model_ids),
                DailyProductionLog.date >= date_from,
                DailyProductionLog.date <= date_to
            ).all()
        else:
            sup_logs = []
        approved_today = sum(1 for l in sup_logs if l.status == 'APPROVED')
        rejected_today = sum(1 for l in sup_logs if l.status == 'REJECTED')
        pending_review = sum(1 for l in sup_logs if l.status in ('SUBMITTED', 'PENDING'))
        total = approved_today + rejected_today + pending_review
        efficiency = round((approved_today / total) * 100, 1) if total > 0 else 0.0
        assigned_models = [m.name for m in CarModel.query.filter_by(supervisor_id=sup.id).all()]
        last_audit = AuditLog.query.filter_by(user_id=sup.id).order_by(AuditLog.timestamp.desc()).first()
        supervisors_data.append({
            "id": sup.id, "name": sup.name, "username": sup.username, "shop": sup.shop,
            "assigned_models": assigned_models,
            "logs_pending_review": pending_review,
            "logs_approved_today": approved_today,
            "logs_rejected_today": rejected_today,
            "efficiency_pct": efficiency,
            "total_reviews": total,
            "last_activity": last_audit.timestamp.isoformat() if last_audit else None,
        })

    # DEO ACTIVITY
    deos_data = []
    deo_users = User.query.filter_by(role='DEO', is_active=True).all()
    for deo in deo_users:
        if f_deo != 'all' and f_deo.lower() not in deo.name.lower():
            continue
        deo_logs = DailyProductionLog.query.filter(
            DailyProductionLog.deo_id == deo.id,
            DailyProductionLog.date >= date_from,
            DailyProductionLog.date <= date_to
        ).order_by(DailyProductionLog.date.desc()).all()
        latest = deo_logs[0] if deo_logs else None
        total_entries = sum(len(l.entries) for l in deo_logs)
        verified_entries = sum(1 for l in deo_logs for e in l.entries if e.supervisor_reviewed)
        model = CarModel.query.filter_by(assigned_deo_id=deo.id).order_by(CarModel.id.desc()).first()
        deos_data.append({
            "id": deo.id, "name": deo.name, "username": deo.username,
            "model": model.name if model else "—",
            "model_code": model.model_code if model else "—",
            "line": model.line.name if (model and model.line) else "—",
            "log_status": latest.status if latest else "NO SUBMISSION",
            "entries_submitted": total_entries,
            "entries_verified": verified_entries,
            "entries_pending": total_entries - verified_entries,
            "last_submission": latest.created_at.isoformat() if latest and latest.created_at else None,
            "logs_count": len(deo_logs),
        })

    # ISSUES & ALERTS
    issues_data = []
    alert_entries = DEOProductionEntry.query.filter(
        or_(
            DEOProductionEntry.status == 'REJECTED',
            and_(DEOProductionEntry.coverage_days != None, DEOProductionEntry.coverage_days < 3,
                 DEOProductionEntry.coverage_days > 0)
        ),
        DEOProductionEntry.date >= date_from,
        DEOProductionEntry.date <= date_to
    ).limit(200).all()

    for entry in alert_entries:
        log = DailyProductionLog.query.get(entry.log_id)
        if not log:
            continue
        if f_model != 'all' and f_model.lower() not in (log.model_name or '').lower():
            continue
        deo_obj = User.query.get(log.deo_id)
        model_obj = CarModel.query.get(log.car_model_id) if log.car_model_id else None
        sup_obj = model_obj.supervisor if model_obj else None
        if f_deo != 'all' and (not deo_obj or f_deo.lower() not in deo_obj.name.lower()):
            continue
        if f_supervisor != 'all' and (not sup_obj or f_supervisor.lower() not in sup_obj.name.lower()):
            continue
        issue_type = "REJECTION" if entry.status == 'REJECTED' else "LOW COVERAGE"
        cov = entry.coverage_days or 0
        severity = "HIGH" if issue_type == "REJECTION" else ("CRITICAL" if cov < 1 else "MEDIUM")
        issues_data.append({
            "id": entry.id,
            "date": entry.date.isoformat() if entry.date else None,
            "issue_type": issue_type,
            "severity": severity,
            "sap_part_number": entry.sap_part_number,
            "part_description": entry.part_description,
            "model": log.model_name,
            "line": model_obj.line.name if (model_obj and model_obj.line) else "—",
            "deo_name": deo_obj.name if deo_obj else "—",
            "supervisor_name": sup_obj.name if sup_obj else "—",
            "rejection_reason": entry.rejection_reason,
            "coverage_days": round(cov, 1),
            "todays_stock": entry.todays_stock,
            "per_day": entry.per_day,
            "log_id": entry.log_id,
        })

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
    issues_data.sort(key=lambda x: severity_order.get(x["severity"], 99))

    # FILTER-AWARE KPIs
    ws_query = DailyWorkStatus.query.filter(
        DailyWorkStatus.date >= date_from, DailyWorkStatus.date <= date_to
    )
    if f_model != 'all':
        model_ids = [m.id for m in CarModel.query.filter(CarModel.name.ilike(f'%{f_model}%')).all()]
        if model_ids:
            ws_query = ws_query.filter(DailyWorkStatus.car_model_id.in_(model_ids))
    ws_entries = ws_query.all()
    total_actual = sum(w.actual_qty for w in ws_entries)
    total_planned = sum(w.planned_qty for w in ws_entries)
    oee_pct = round((total_actual / total_planned) * 100, 1) if total_planned > 0 else 0.0

    kpis = {
        "total_actual_qty": total_actual,
        "total_planned_qty": total_planned,
        "oee_pct": oee_pct,
        "active_lines": len([l for l in lines_data if l["log_status"] != "IDLE"]),
        "pending_reviews": sum(l["pending_reviews"] for l in lines_data),
        "total_issues": len(issues_data),
        "supervisors_active": len([s for s in supervisors_data if s["total_reviews"] > 0]),
        "deos_submitted_today": len([d for d in deos_data if d["log_status"] in ("SUBMITTED", "APPROVED", "VERIFIED")])
    }

    return jsonify({
        "success": True,
        "filters_applied": {
            "model": f_model, "line": f_line, "supervisor": f_supervisor,
            "deo": f_deo, "time": f_time,
            "date_from": date_from.isoformat(), "date_to": date_to.isoformat()
        },
        "kpis": kpis,
        "lines": lines_data,
        "supervisors": supervisors_data,
        "deos": deos_data,
        "issues": issues_data
    })


# ===========================================================================
# INVENTORY MANAGEMENT ENDPOINTS (Admin Only)
# ===========================================================================

@admin_bp.route('/inventory', methods=['GET'])
@jwt_required()
@role_required(['Admin'])
def get_inventory():
    from app.models import InventoryItem
    q = InventoryItem.query
    model_id = request.args.get('model_id')
    demand_id = request.args.get('demand_id')
    status_f = request.args.get('status')
    if model_id:
        q = q.filter(InventoryItem.car_model_id == int(model_id))
    if demand_id:
        q = q.filter(InventoryItem.demand_id == int(demand_id))
    if status_f:
        q = q.filter(InventoryItem.status == status_f.upper())
    items = q.order_by(InventoryItem.car_model_id.asc(), InventoryItem.serial_number.asc()).all()
    result = [item.to_dict() for item in items]
    model_action_map = {}
    for item in items:
        mid = item.car_model_id
        if mid not in model_action_map:
            model_action_map[mid] = {'all_ok': True, 'has_pending_deo': False}
        if item.action == 'NEW_DEMAND':
            model_action_map[mid]['all_ok'] = False
        if item.action == 'PENDING_DEO':
            model_action_map[mid]['has_pending_deo'] = True
    return jsonify({
        "success": True,
        "data": result,
        "total": len(result),
        "model_summary": {
            str(mid): (
                "PENDING_DEO" if v['has_pending_deo'] else
                "GO_TO_PRODUCTION" if v['all_ok'] else
                "NEW_DEMAND"
            )
            for mid, v in model_action_map.items()
        }
    })


@admin_bp.route('/inventory', methods=['POST'])
@jwt_required()
@role_required(['Admin'])
def create_inventory_item():
    from app.models import InventoryItem
    from sqlalchemy import func
    data = request.json or {}
    if not data.get('sap_part_number'):
        return jsonify({"success": False, "message": "SAP Part Number is required"}), 400
    max_sn = db.session.query(func.max(InventoryItem.serial_number)).filter(
        InventoryItem.car_model_id == data.get('car_model_id')
    ).scalar() or 0
    current_stock = float(data.get('current_stock', 0))
    demand_qty = float(data.get('demand_quantity', 0))
    item = InventoryItem(
        serial_number=max_sn + 1,
        car_model_id=data.get('car_model_id'),
        demand_id=data.get('demand_id'),
        vehicle_name=data.get('vehicle_name', ''),
        sap_part_number=data['sap_part_number'],
        part_description=data.get('part_description', ''),
        current_stock=current_stock,
        demand_quantity=demand_qty,
        status='SUFFICIENT' if current_stock >= demand_qty else 'SHORTAGE'
    )
    db.session.add(item)
    db.session.commit()
    log_audit("CREATE_INVENTORY_ITEM")
    return jsonify({"success": True, "message": "Inventory item created", "data": item.to_dict()}), 201


@admin_bp.route('/inventory/seed-from-demand/<int:demand_id>', methods=['POST'])
@jwt_required()
@role_required(['Admin'])
def seed_inventory_from_demand(demand_id):
    from app.models import InventoryItem, Demand, MasterData, DEOProductionEntry
    demand = Demand.query.get(demand_id)
    if not demand:
        return jsonify({"success": False, "message": "Demand not found"}), 404
    model_name = demand.model_name
    order_qty = float(demand.quantity or 0)
    parts = MasterData.query.filter(MasterData.model.ilike(f'%{model_name}%')).all()
    if not parts:
        return jsonify({"success": False, "message": f"No MasterData parts found for model '{model_name}'."}), 404
    created_count = 0
    updated_count = 0
    for idx, part in enumerate(parts, start=1):
        latest_entry = DEOProductionEntry.query.filter(
            DEOProductionEntry.sap_part_number == part.sap_part_number
        ).order_by(DEOProductionEntry.id.desc()).first()
        current_stock = float(latest_entry.todays_stock or 0) if latest_entry else 0.0
        status = 'SUFFICIENT' if current_stock >= order_qty else 'SHORTAGE'
        existing = InventoryItem.query.filter_by(
            demand_id=demand_id,
            sap_part_number=part.sap_part_number
        ).first()
        if existing:
            existing.current_stock = current_stock
            existing.demand_quantity = order_qty
            existing.status = status
            updated_count += 1
        else:
            new_item = InventoryItem(
                serial_number=idx,
                car_model_id=demand.model_id,
                demand_id=demand_id,
                vehicle_name=model_name,
                sap_part_number=part.sap_part_number,
                part_description=part.description or '',
                current_stock=current_stock,
                demand_quantity=order_qty,
                status=status
            )
            db.session.add(new_item)
            created_count += 1
    db.session.commit()
    log_audit("SEED_INVENTORY_FROM_DEMAND")
    return jsonify({
        "success": True,
        "message": f"Inventory seeded from demand {demand_id}",
        "created": created_count,
        "updated": updated_count,
        "model": model_name,
        "order_quantity": order_qty
    })


@admin_bp.route('/inventory/<int:item_id>', methods=['GET'])
@jwt_required()
@role_required(['Admin'])
def get_inventory_item(item_id):
    from app.models import InventoryItem
    item = InventoryItem.query.get(item_id)
    if not item:
        return jsonify({"success": False, "message": "Inventory item not found"}), 404
    return jsonify({"success": True, "data": item.to_dict()})


@admin_bp.route('/inventory/<int:item_id>', methods=['PUT', 'PATCH'])
@jwt_required()
@role_required(['Admin'])
def update_inventory_item(item_id):
    from app.models import InventoryItem
    item = InventoryItem.query.get(item_id)
    if not item:
        return jsonify({"success": False, "message": "Inventory item not found"}), 404
    data = request.json or {}
    if 'current_stock' in data:
        item.current_stock = float(data['current_stock'])
    if 'demand_quantity' in data:
        item.demand_quantity = float(data['demand_quantity'])
    if 'part_description' in data:
        item.part_description = data['part_description']
    if 'sap_part_number' in data:
        item.sap_part_number = data['sap_part_number']
    if 'vehicle_name' in data:
        item.vehicle_name = data['vehicle_name']
    if 'status' not in data:
        item.status = 'SUFFICIENT' if item.current_stock >= item.demand_quantity else 'SHORTAGE'
    else:
        item.status = data['status']
    db.session.commit()
    log_audit("UPDATE_INVENTORY_ITEM")
    return jsonify({"success": True, "message": "Inventory item updated", "data": item.to_dict()})


@admin_bp.route('/inventory/<int:item_id>', methods=['DELETE'])
@jwt_required()
@role_required(['Admin'])
def delete_inventory_item(item_id):
    from app.models import InventoryItem
    item = InventoryItem.query.get(item_id)
    if not item:
        return jsonify({"success": False, "message": "Inventory item not found"}), 404
    db.session.delete(item)
    db.session.commit()
    log_audit("DELETE_INVENTORY_ITEM")
    return jsonify({"success": True, "message": "Inventory item deleted"})


# ---------------------------------------------------------------------------
# Part Shortage Requests - Admin side
# ---------------------------------------------------------------------------

@admin_bp.route('/shortage-requests', methods=['GET'])
@jwt_required()
@role_required(['Admin'])
def get_shortage_requests():
    from app.models import PartShortageRequest
    status_f = request.args.get('status')
    q = PartShortageRequest.query
    if status_f:
        q = q.filter(PartShortageRequest.status == status_f.upper())
    reqs = q.order_by(PartShortageRequest.id.desc()).all()
    return jsonify({"success": True, "data": [r.to_dict() for r in reqs]})


@admin_bp.route('/shortage-requests', methods=['POST'])
@jwt_required()
@role_required(['Admin'])
def create_shortage_request():
    from app.models import PartShortageRequest, InventoryItem
    from sqlalchemy import func
    data = request.json or {}
    item_ids = data.get('inventory_item_ids', [])
    deadline_str = data.get('deadline')
    deo_id = data.get('deo_id')
    supervisor_id = data.get('supervisor_id')
    line_id = data.get('line_id')
    
    if not item_ids:
        return jsonify({"success": False, "message": "inventory_item_ids list is required"}), 400
    deadline = None
    if deadline_str:
        try:
            deadline = datetime.date.fromisoformat(deadline_str)
        except ValueError:
            return jsonify({"success": False, "message": "Invalid deadline format (use YYYY-MM-DD)"}), 400
    max_psr_id = db.session.query(func.max(PartShortageRequest.id)).scalar() or 0
    created = []
    for i, item_id in enumerate(item_ids):
        item = InventoryItem.query.get(item_id)
        if not item:
            continue
        item.status = 'PENDING_DEO'
        shortage_qty = max(item.demand_quantity - item.current_stock, 0)
        psr = PartShortageRequest(
            formatted_id=f"PSR-{(max_psr_id + i + 1):03d}",
            inventory_item_id=item.id,
            shortage_quantity=shortage_qty,
            deadline=deadline,
            status='PENDING',
            deo_id=deo_id,
            supervisor_id=supervisor_id,
            line_id=line_id
        )
        db.session.add(psr)
        created.append(psr)
    db.session.commit()
    log_audit("CREATE_SHORTAGE_REQUEST")
    return jsonify({
        "success": True,
        "message": f"{len(created)} shortage request(s) created",
        "data": [r.to_dict() for r in created]
    }), 201


@admin_bp.route('/shortage-requests/<int:req_id>/approve', methods=['PATCH'])
@jwt_required()
@role_required(['Admin'])
def approve_shortage_request(req_id):
    from app.models import PartShortageRequest
    psr = PartShortageRequest.query.get(req_id)
    if not psr:
        return jsonify({"success": False, "message": "Shortage request not found"}), 404
    if psr.status != 'DEO_FILLED':
        return jsonify({"success": False, "message": "Cannot approve: DEO has not submitted yet"}), 400
    data = request.json or {}
    item = psr.inventory_item
    if item and psr.todays_stock is not None:
        item.current_stock = float(psr.todays_stock)
        item.status = 'IN_PRODUCTION' if item.current_stock >= item.demand_quantity else 'SHORTAGE'
    psr.status = 'COMPLETED'
    psr.admin_approved_at = datetime.datetime.now()
    psr.admin_notes = data.get('admin_notes', '')
    db.session.commit()
    log_audit("APPROVE_SHORTAGE_REQUEST")
    return jsonify({
        "success": True,
        "message": "Shortage request approved. Inventory updated.",
        "shortage_request": psr.to_dict(),
        "inventory_item": item.to_dict() if item else None
    })
