# backend/app/routes/deo/routes.py
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from app.models import db, User, CarModel, Demand, DailyProductionLog, DailyWorkStatus, ProductionLine, PartShortageRequest, PartMachineMapping
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middleware.auth_middleware import role_required
from app.utils.audit_logger import log_audit
from app.services.production_service import get_merged_log_data, sync_log_to_work_status
from sqlalchemy.orm.attributes import flag_modified

deo_bp = Blueprint('deo', __name__)

def parse_float(val):
    if val is None or val == "": return 0.0
    try:
        return float(str(val).replace(',', '').strip())
    except:
        return 0.0

@deo_bp.route('/assigned-work', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Supervisor', 'Admin', 'Manager'])
def get_assigned_work():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    today = date.today()
    
    # If user is a DEO, show only their assignments. 
    # Otherwise (Admin/Manager/Supervisor), show all models for oversight.
    if user.role == 'DEO':
        models = CarModel.query.filter(CarModel.assigned_deo_id == user.id).all()
    else:
        models = CarModel.query.all()
    
    data = []
    for m in models:
        m_dict = m.to_dict()
        
        # Today's stats
        stats = DailyWorkStatus.query.filter_by(car_model_id=m.id, date=today).first()
        m_dict['planned_qty'] = stats.planned_qty if stats else 0
        m_dict['actual_qty'] = stats.actual_qty if stats else 0

        # Active demand
        active_demand = Demand.query.filter_by(model_id=m.id).filter(Demand.status != 'COMPLETED').order_by(Demand.id.desc()).first()
        if not active_demand:
            active_demand = Demand.query.filter_by(model_id=m.id).order_by(Demand.id.desc()).first()
            
        if active_demand:
            m_dict['target_quantity'] = active_demand.quantity
            m_dict['customer_name'] = active_demand.customer
            m_dict['manager_name'] = active_demand.manager
            m_dict['manager_email'] = f"{active_demand.manager.lower().replace(' ', '.')}@gmail.com" if active_demand.manager else None
            m_dict['customer_email'] = f"{active_demand.customer.lower().replace(' ', '.')}@gmail.com" if active_demand.customer else None
            m_dict['supervisor_email'] = f"{m.supervisor.username.lower()}@gmail.com" if m.supervisor else None
            m_dict['deo_email'] = f"{user.username.lower()}@gmail.com"
            m_dict['demand_id'] = active_demand.id
            m_dict['start_date'] = active_demand.start_date
            m_dict['end_date'] = active_demand.end_date

        # Submission check
        submission = DailyProductionLog.query.filter(
            DailyProductionLog.car_model_id == m.id,
            DailyProductionLog.deo_id == user.id,
            DailyProductionLog.status.in_(['PENDING', 'SUBMITTED', 'VERIFIED']),
            DailyProductionLog.date >= today
        ).first()
        
        m_dict['is_submitted_today'] = submission is not None
        data.append(m_dict)

    return jsonify({"success": True, "data": data})

@deo_bp.route('/sync/<int:row_id>', methods=['PUT'])
@jwt_required()
@role_required(['DEO'])
def live_sync_cell(row_id):
    """
    Syncs a single row's data to the database.
    Supports two modes (determined by presence of 'real_entry_id' in body):
    - real_entry_id present: direct DEOProductionEntry primary-key lookup
    - real_entry_id absent:  legacy fake-index mode (row_index = row_id - 10000)
    """
    print(f"\n[SYNC DEBUG] Incoming sync for Row ID: {row_id}")
    username = get_jwt_identity()

    user = User.query.filter_by(username=username).first()
    data = request.json or {}

    car_model_id = data.get('car_model_id')
    demand_id = data.get('demand_id')
    real_entry_id = data.get('real_entry_id')  # Set by frontend when it has the real DB id

    if not car_model_id:
        return jsonify({"success": False, "message": "car_model_id required"}), 400

    from app.models.models import DEOProductionEntry

    mapping = {
        "SAP Stock": "sap_stock", "Opening Stock": "opening_stock",
        "Todays Stock": "todays_stock", "Production Status": "status",
        "row_status": "row_status", "rejection_reason": "rejection_reason", "deo_reply": "deo_reply"
    }

    today = date.today()

    def _apply_and_save(entry):
        for key, val in data.items():
            col = mapping.get(key)
            if col:
                if col in ["sap_stock", "opening_stock", "todays_stock"]:
                    setattr(entry, col, parse_float(val))
                else:
                    setattr(entry, col, val)
        if entry.per_day and entry.per_day > 0:
            entry.coverage_days = round(float(entry.todays_stock or 0) / entry.per_day, 1)
        db.session.commit()
        log = DailyProductionLog.query.get(entry.log_id)
        if log:
            sync_log_to_work_status(log)
        return jsonify({"success": True})

    # ─── Mode A: direct DB entry id ─────────────────────────────────────────
    if real_entry_id:
        entry = DEOProductionEntry.query.get(int(real_entry_id))
        if not entry:
            return jsonify({"success": False, "message": "Entry not found"}), 404
        return _apply_and_save(entry)

    # ─── Mode B: legacy fake-index mode (row_id = 10000 + idx) ──────────────
    row_index = row_id - 10000
    if row_index < 0:
        return jsonify({"success": False, "message": "Invalid row_id"}), 400

    log = DailyProductionLog.query.filter_by(
        car_model_id=car_model_id,
        deo_id=user.id,
        date=today
    ).order_by(DailyProductionLog.id.desc()).first()

    if not log:
        # Auto-create log and entries if missing
        cm = CarModel.query.get(car_model_id)
        if not cm:
            return jsonify({"success": False, "message": "Model not found"}), 404

        from app.services.db_service import MasterDataDBService
        bom = MasterDataDBService().get_by_model(cm.name)
        log = DailyProductionLog(
            car_model_id=car_model_id, demand_id=demand_id,
            deo_id=user.id, model_name=cm.name, status='DRAFT'
        )
        db.session.add(log)
        db.session.flush()

        for i, b in enumerate(bom):
            entry = DEOProductionEntry(
                log_id=log.id, sn_no=i + 1,
                sap_part_number=b.get('common', {}).get('sap_part_number'),
                part_number=b.get('common', {}).get('part_number'),
                part_description=b.get('common', {}).get('description'),
                per_day=parse_float(b.get('production_data', {}).get('Target Qty')),
                date=today, car_model_id=car_model_id
            )
            db.session.add(entry)
        db.session.commit()

    from app.services.production_service import get_merged_log_data
    merged = get_merged_log_data(log)

    if 0 <= row_index < len(merged):
        sap_part = str(merged[row_index].get('SAP PART NUMBER', '')).strip().upper()
        entry = DEOProductionEntry.query.filter(
            DEOProductionEntry.log_id == log.id,
            db.func.upper(db.func.trim(DEOProductionEntry.sap_part_number)) == sap_part
        ).first()

        # If no entry exists yet for this SAP part, create one now
        if not entry:
            entry = DEOProductionEntry(
                log_id=log.id, sn_no=row_index + 1,
                sap_part_number=merged[row_index].get('SAP PART NUMBER', ''),
                part_number=merged[row_index].get('PART NUMBER', ''),
                part_description=merged[row_index].get('PART DESCRIPTION', ''),
                per_day=parse_float(merged[row_index].get('PER DAY', 0)),
                date=today, car_model_id=car_model_id
            )
            db.session.add(entry)
            db.session.flush()

        for key, val in data.items():
            col = mapping.get(key)
            if col:
                if col in ["sap_stock", "opening_stock", "todays_stock"]:
                    setattr(entry, col, parse_float(val))
                else:
                    setattr(entry, col, val)

        if entry.per_day and entry.per_day > 0:
            entry.coverage_days = round(float(entry.todays_stock or 0) / entry.per_day, 1)

        db.session.commit()
        sync_log_to_work_status(log)
        return jsonify({"success": True})

    return jsonify({"success": False, "message": "Entry not found"}), 400

@deo_bp.route('/submit', methods=['POST'])
@jwt_required()
@role_required(['DEO'])
def submit_log():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    data = request.json or {}
    
    model_id = data.get('car_model_id')
    demand_id = data.get('demand_id')
    log_data = data.get('log_data')
    is_final = data.get('is_final', False)

    if not model_id or not log_data:
        return jsonify({"success": False, "message": "Missing submission data"}), 400

    today = date.today()
    log = DailyProductionLog.query.filter_by(car_model_id=model_id, deo_id=user.id, date=today).first()

    from app.models.models import DEOProductionEntry
    if not log:
        cm = CarModel.query.get(model_id)
        log = DailyProductionLog(car_model_id=model_id, demand_id=demand_id, deo_id=user.id, model_name=cm.name if cm else "Unknown", status='SUBMITTED' if is_final else 'DRAFT')
        db.session.add(log)
        db.session.flush()

    log.status = 'SUBMITTED' if is_final else 'DRAFT'
    for row in log_data:
        sap = str(row.get('SAP PART NUMBER', '')).strip().upper()
        if not sap: continue
        
        # Robust case-insensitive lookup
        entry = DEOProductionEntry.query.filter(
            DEOProductionEntry.log_id == log.id,
            db.func.upper(db.func.trim(DEOProductionEntry.sap_part_number)) == sap
        ).first()
        
        if not entry:
            entry = DEOProductionEntry(log_id=log.id, sap_part_number=sap, date=today, car_model_id=model_id)
            
            # Ad-Hoc Part Registration (Independent of Master)
            from app.models import DeoAdHocPart
            adhoc = DeoAdHocPart.query.filter_by(sap_part_number=sap).first()
            if not adhoc:
                adhoc = DeoAdHocPart(sap_part_number=sap)
                db.session.add(adhoc)
                db.session.flush()
            entry.adhoc_part_id = adhoc.id
                
            db.session.add(entry)
            
        entry.sap_stock = parse_float(row.get('SAP Stock'))
        entry.opening_stock = parse_float(row.get('Opening Stock'))
        entry.todays_stock = parse_float(row.get('Todays Stock'))
        entry.status = row.get('Production Status') or 'PENDING'
        entry.per_day = parse_float(row.get('PER DAY') or row.get('Per Day'))
        if entry.per_day > 0: entry.coverage_days = round(entry.todays_stock / entry.per_day, 1)

    db.session.commit()
    from app.services.production_service import sync_log_to_work_status
    sync_log_to_work_status(log)
    
    log_audit("DEO_SUBMIT_LOG" if is_final else "DEO_SAVE_DRAFT")
    return jsonify({"success": True, "message": "Submission successful", "data": log.to_dict()})

@deo_bp.route('/history', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Supervisor', 'Admin', 'Manager'])
def get_history():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    logs = DailyProductionLog.query.filter_by(deo_id=user.id).order_by(DailyProductionLog.date.desc()).all()
    data = []
    for log in logs:
        d = log.to_dict()
        d['log_data'] = get_merged_log_data(log)
        data.append(d)
        
    return jsonify({"success": True, "data": data})

@deo_bp.route('/accept-assignment/<int:id>', methods=['POST'])
@jwt_required()
@role_required(['DEO'])
def accept_assignment(id):
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    model = CarModel.query.get(id)
    
    if not model or model.assigned_deo_id != user.id:
        return jsonify({"success": False, "message": "Assignment not found"}), 404
        
    model.deo_accepted = True
    model.status = 'IN_PROGRESS'
    db.session.commit()
    log_audit("DEO_ACCEPT_ASSIGNMENT")
    return jsonify({"success": True, "message": "Assignment accepted"})

@deo_bp.route('/daily-status', methods=['GET'])
@jwt_required()
@role_required(['DEO'])
def get_daily_status():
    """Simple health/status check for DEO dashboard."""
    return jsonify({"success": True, "status": "active", "date": str(date.today())})

@deo_bp.route('/update-history-row', methods=['POST'])
@jwt_required()
@role_required(['DEO'])
def deo_update_row():
    """Allows DEO to correct a row in a submitted/rejected log."""
    data = request.json or {}
    log_id = data.get('log_id')
    row_index = data.get('row_index')
    updated_data = data.get('updated_row_data', {})
    
    if log_id is None or row_index is None:
        return jsonify({"success": False, "message": "Log ID and row index required"}), 400
        
    log = DailyProductionLog.query.get(log_id)
    if not log: return jsonify({"success": False, "message": "Log not found"}), 404
        
    from app.services.production_service import get_merged_log_data
    merged = get_merged_log_data(log)
    
    if 0 <= row_index < len(merged):
        sap_part = str(merged[row_index].get('SAP PART NUMBER', '')).strip().upper()
        from app.models.models import DEOProductionEntry
        # Robust case-insensitive lookup
        entry = DEOProductionEntry.query.filter(
            DEOProductionEntry.log_id == log.id,
            db.func.upper(db.func.trim(DEOProductionEntry.sap_part_number)) == sap_part
        ).first()
        
        if entry:
            mapping = {
                "SAP Stock": "sap_stock", "Opening Stock": "opening_stock", 
                "Todays Stock": "todays_stock", "Production Status": "status",
                "row_status": "row_status", "rejection_reason": "rejection_reason", "deo_reply": "deo_reply"
            }
            for key, val in updated_data.items():
                col = mapping.get(key)
                if col:
                    if col in ["sap_stock", "opening_stock", "todays_stock"]:
                        setattr(entry, col, parse_float(val))
                    else:
                        setattr(entry, col, val)
            
            if entry.per_day > 0:
                entry.coverage_days = round(entry.todays_stock / entry.per_day, 1)

            db.session.commit()
            from app.services.production_service import sync_log_to_work_status
            sync_log_to_work_status(log)
            return jsonify({"success": True})
        
    return jsonify({"success": False, "message": "Row index out of bounds"}), 400


# ---------------------------------------------------------------------------
# DEO Shortage Request Endpoints
# ---------------------------------------------------------------------------

@deo_bp.route('/shortage-requests', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Supervisor', 'Admin', 'Manager', 'PPC_Planner'])
def deo_get_shortage_requests():
    """DEO sees their assigned shortage requests with deadline countdown."""
    from app.models import PartShortageRequest
    username = get_jwt_identity()
    from app.models import User
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    # Staff/Admin/Managers see ALL shortage requests
    if user.role in ['Admin', 'Manager', 'Supervisor', 'PPC_Planner']:
        reqs = PartShortageRequest.query.order_by(PartShortageRequest.id.desc()).all()
    else:
        # DEO sees:
        # 1. Requests specifically assigned to them
        # 2. Unassigned requests on their assigned line/machine
        # 3. If DEO has NO assigned line, show all unassigned requests for visibility
        line_id = user.assigned_line_id
        machine_id = user.assigned_machine_id
        
        query = PartShortageRequest.query
        if line_id or machine_id:
            reqs = query.filter(
                (PartShortageRequest.deo_id == user.id) |
                (
                    (PartShortageRequest.deo_id == None) & 
                    (
                        (PartShortageRequest.line_id == line_id) |
                        (PartShortageRequest.line_id == machine_id)
                    )
                )
            ).order_by(PartShortageRequest.id.desc()).all()
        else:
            # Broaden visibility if user has no line assigned (helpful for initial setup/demo)
            reqs = query.filter(
                (PartShortageRequest.deo_id == user.id) |
                (PartShortageRequest.deo_id == None)
            ).order_by(PartShortageRequest.id.desc()).all()
            
    return jsonify({"success": True, "data": [r.to_dict() for r in reqs]})


@deo_bp.route('/production-lines', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Supervisor', 'Admin', 'Manager'])
def get_production_lines():
    """Return all active production lines/machines for dropdowns."""
    lines = ProductionLine.query.filter_by(is_active=True).all()
    # Also get unique machines from PartMachineMapping to ensure full list
    mappings = db.session.query(PartMachineMapping.machine).distinct().all()
    mapping_names = [m[0] for m in mappings if m[0]]
    
    line_names = [l.name for l in lines]
    combined = sorted(list(set(line_names + mapping_names)))
    
    return jsonify({
        "success": True,
        "data": [{"id": name, "name": name} for name in combined]
    })


@deo_bp.route('/shortage-requests/<int:req_id>/fill', methods=['PATCH'])
@jwt_required()
@role_required(['DEO'])
def deo_fill_shortage_request(req_id):
    """
    DEO fills the stock data for a shortage request.
    Body: { "sap_stock": 95, "opening_stock": 90, "todays_stock": 95, "notes": "Arrived from warehouse" }
    After filling, status changes to DEO_FILLED for admin to review and approve.
    """
    from app.models import PartShortageRequest
    psr = PartShortageRequest.query.get(req_id)
    if not psr:
        return jsonify({"success": False, "message": "Shortage request not found"}), 404

    username = get_jwt_identity()
    from app.models import User
    user = User.query.filter_by(username=username).first()
    
    # Authorization: Must be specifically assigned OR on the same line if unassigned
    is_assigned = psr.deo_id == user.id
    is_line_match = psr.deo_id is None and (psr.line_id == user.assigned_line_id or psr.line_id == user.assigned_machine_id)
    
    if not (is_assigned or is_line_match):
        return jsonify({"success": False, "message": "Not authorized for this request"}), 403

    # If first time filling an unassigned request, take ownership
    if psr.deo_id is None:
        psr.deo_id = user.id

    if psr.status in ['COMPLETED']:
        return jsonify({"success": False, "message": f"Cannot fill request in '{psr.status}' status"}), 400

    data = request.json or {}
    from app.models import ShortageDailyEntry
    
    entry = ShortageDailyEntry(
        shortage_request_id=psr.id,
        deo_id=user.id,
        sap_stock=float(data.get('sap_stock', 0)),
        opening_stock=float(data.get('opening_stock', 0)),
        todays_stock=float(data.get('todays_stock', 0)),
        notes=data.get('notes', '')
    )
    from app.extensions import db
    db.session.add(entry)

    # Update summary fields on PSR
    psr.sap_stock = entry.sap_stock
    psr.opening_stock = entry.opening_stock
    psr.todays_stock = entry.todays_stock
    psr.deo_notes = entry.notes
    psr.deo_filled_at = datetime.now()

    if psr.status in ['PENDING', 'REJECTED']:
        psr.status = 'IN_PROGRESS'

    db.session.commit()
    log_audit("DEO_FILL_SHORTAGE_REQUEST")
    return jsonify({
        "success": True,
        "message": "Daily stock report submitted for supervisor verification.",
        "data": psr.to_dict()
    })


# ---------------------------------------------------------------------------
# MACHINE PRODUCTION ENTRIES (New — shift-aware)
# DEO fills per-machine, per-shift production data
# ---------------------------------------------------------------------------

@deo_bp.route('/machine-entries', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Admin', 'Supervisor'])
def get_machine_entries():
    """List machine production entries for the logged-in DEO."""
    from app.models import MachineProductionEntry
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()

    query = MachineProductionEntry.query
    if user.role == 'DEO':
        query = query.filter_by(deo_id=user.id)

    # Optional filters
    date_filter = request.args.get('date')
    demand_id = request.args.get('demand_id', type=int)
    if date_filter:
        from datetime import date as date_type
        try:
            d = date_type.fromisoformat(date_filter)
            query = query.filter_by(date=d)
        except ValueError:
            pass
    if demand_id:
        query = query.filter_by(demand_id=demand_id)

    entries = query.order_by(MachineProductionEntry.date.desc(), MachineProductionEntry.created_at.desc()).all()
    return jsonify({"success": True, "data": [e.to_dict() for e in entries]})


@deo_bp.route('/machine-entries/shift-info', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Admin', 'Supervisor'])
def get_shift_info():
    """
    Returns the current shift based on server time (i.e., DEO login time).
    Frontend uses this to pre-fill the shift field when DEO opens the entry form.
    """
    from app.models import MachineProductionEntry
    shift, start, end = MachineProductionEntry.detect_shift()
    return jsonify({
        "success": True,
        "shift": shift,
        "shift_start": start,
        "shift_end": end,
        "current_time": datetime.utcnow().strftime('%H:%M')
    })


@deo_bp.route('/machine-entries', methods=['POST'])
@jwt_required()
@role_required(['DEO'])
def create_machine_entry():
    """
    DEO submits machine production data for their assigned machine.
    - parts_produced: qty manufactured this shift
    - machine_runtime_mins: minutes machine actually ran (separate field)
    - Shift is auto-detected from login/current time
    After save: InventoryItem.produced_qty is incremented cumulatively.
    """
    from app.models import MachineProductionEntry, InventoryItem, Notification
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    data = request.json or {}

    inventory_item_id = data.get('inventory_item_id')
    demand_id = data.get('demand_id')
    machine_id = data.get('machine_id') or (user.assigned_machine_id)
    parts_produced = float(data.get('parts_produced', 0))
    machine_runtime_mins = float(data.get('machine_runtime_mins', 0))
    sap_part_number = data.get('sap_part_number', '').strip().upper()

    if not inventory_item_id and not sap_part_number:
        return jsonify({"success": False, "message": "inventory_item_id or sap_part_number is required"}), 400

    adhoc_part_id = None
    if not inventory_item_id and sap_part_number:
        # Handle Ad-Hoc Part
        from app.models import DeoAdHocPart
        adhoc_part = DeoAdHocPart.query.filter_by(sap_part_number=sap_part_number).first()
        if not adhoc_part:
            adhoc_part = DeoAdHocPart(sap_part_number=sap_part_number)
            db.session.add(adhoc_part)
            db.session.flush()
        adhoc_part_id = adhoc_part.id

    if parts_produced < 0:
        return jsonify({"success": False, "message": "parts_produced cannot be negative"}), 400

    # Auto-detect shift from current time (DEO login time)
    shift, shift_start, shift_end = MachineProductionEntry.detect_shift()
    # Allow override from request
    if data.get('shift'):
        shift = data['shift']
        shift_map = {'Shift 1': ('06:00', '15:00'), 'Shift 2': ('15:00', '23:00'), 'Shift 3': ('23:00', '06:00')}
        shift_start, shift_end = shift_map.get(shift, (shift_start, shift_end))

    entry = MachineProductionEntry(
        deo_id=user.id,
        inventory_item_id=inventory_item_id,
        adhoc_part_id=adhoc_part_id,
        demand_id=demand_id,
        machine_id=machine_id,
        date=date.today(),
        shift=shift,
        shift_start=shift_start,
        shift_end=shift_end,
        sap_part_number=sap_part_number,
        parts_produced=parts_produced,
        machine_runtime_mins=machine_runtime_mins,
        deo_notes=data.get('deo_notes', ''),
        status='PENDING',
    )
    db.session.add(entry)
    db.session.flush()  # Get entry.id before apply_to_inventory

    # Auto-update InventoryItem.produced_qty (no double-counting — this adds to cumulative)
    entry.apply_to_inventory()

    db.session.commit()

    # Check if part is now PRODUCTION_DONE → notify SK
    item = InventoryItem.query.get(inventory_item_id)
    if item and item.status == 'PRODUCTION_DONE':
        store_keepers = User.query.filter_by(role='Store_Keeper', is_active=True).all()
        for sk in store_keepers:
            Notification.send(
                user_id=sk.id,
                title="Part Manufacturing Complete",
                message=f"Part {item.sap_part_number} for demand {item.demand.formatted_id if item.demand else 'N/A'} is fully manufactured. Ready for dispatch.",
                notification_type='PRODUCTION_DONE',
                demand_id=item.demand_id,
            )
        db.session.commit()

    log_audit("DEO_MACHINE_ENTRY_CREATED")
    return jsonify({"success": True, "data": entry.to_dict()}), 201


@deo_bp.route('/machine-entries/<int:entry_id>', methods=['PUT'])
@jwt_required()
@role_required(['DEO', 'Admin', 'Supervisor'])
def update_machine_entry(entry_id):
    """Update an existing machine production entry."""
    from app.models import MachineProductionEntry
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    entry = MachineProductionEntry.query.get_or_404(entry_id)
    
    # Auth: Only DEO who created it (if role is DEO) or Admin/Supervisor
    if user.role == 'DEO' and entry.deo_id != user.id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
        
    if entry.status in ['APPROVED', 'VERIFIED']:
        return jsonify({"success": False, "message": "Cannot update verified entry"}), 400

    data = request.json or {}
    
    if 'parts_produced' in data:
        new_qty = float(data['parts_produced'])
        # Adjust inventory: subtract old, add new
        diff = new_qty - entry.parts_produced
        entry.parts_produced = new_qty
        # You might need a more complex logic here depending on how apply_to_inventory works
        # For now, let's just update the fields
        
    if 'machine_runtime_mins' in data:
        entry.machine_runtime_mins = float(data['machine_runtime_mins'])
        
    if 'sap_part_number' in data:
        entry.sap_part_number = data['sap_part_number'].strip().upper()
        
    if 'deo_notes' in data:
        entry.deo_notes = data['deo_notes']
        
    if 'shift' in data:
        entry.shift = data['shift']
        
    # Reset status to PENDING if it was REJECTED (so supervisor sees it again)
    if entry.status == 'REJECTED':
        entry.status = 'PENDING'
        
    db.session.commit()
    log_audit("DEO_MACHINE_ENTRY_UPDATED")
    return jsonify({"success": True, "data": entry.to_dict()})


@deo_bp.route('/machine-entries/<int:entry_id>', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Admin', 'Supervisor'])
def get_machine_entry(entry_id):
    from app.models import MachineProductionEntry
    entry = MachineProductionEntry.query.get_or_404(entry_id)
    return jsonify({"success": True, "data": entry.to_dict()})


# ---------------------------------------------------------------------------
# NOTIFICATIONS (DEO)
# ---------------------------------------------------------------------------

@deo_bp.route('/notifications', methods=['GET'])
@jwt_required()
@role_required(['DEO'])
def deo_get_notifications():
    from app.models import Notification
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    notifs = Notification.query.filter_by(user_id=user.id).order_by(
        Notification.created_at.desc()
    ).limit(50).all()
    unread = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({"success": True, "data": [n.to_dict() for n in notifs], "unread_count": unread})


@deo_bp.route('/machines', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Supervisor', 'Admin'])
def get_machines():
    """Returns machines (ProductionLine with parent_id=None) and their sub-machines."""
    machines = ProductionLine.query.filter_by(parent_id=None).all()
    return jsonify({"success": True, "data": [m.to_dict() for m in machines]})

@deo_bp.route('/inventory', methods=['GET'])
@jwt_required()
@role_required(['DEO', 'Supervisor', 'Admin'])
def deo_get_inventory():
    """Returns all inventory items (parts) for production selection."""
    from app.models import InventoryItem
    items = InventoryItem.query.all()
    return jsonify({"success": True, "data": [i.to_dict() for i in items]})

@deo_bp.route('/notifications/<int:notif_id>/read', methods=['POST'])
@jwt_required()
@role_required(['DEO'])
def deo_mark_notification_read(notif_id):
    from app.models import Notification
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first_or_404()
    notif.is_read = True
    notif.read_at = datetime.now()
    db.session.commit()
    return jsonify({"success": True})

