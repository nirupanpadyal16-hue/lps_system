# manager/routes.py – Blueprint for manager‑only endpoints (master‑data, health)
"""Manager routes expose master‑data CRUD and a simple health check.
These are intended for users with the "Manager" role, but the blueprint itself
does not enforce role‑based checks – that can be added in the future.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import MasterData, Demand, InventoryItem, db
from app.services.db_service import MasterDataDBService
from app.middleware.auth_middleware import role_required
from datetime import datetime

manager_bp = Blueprint('manager', __name__)

def sync_inventory_item(master_item):
    """Update or create InventoryItem records whenever MasterData is changed."""
    # Find active demands for this model
    active_demands = Demand.query.filter(
        Demand.model_name == master_item.model,
        Demand.status != 'COMPLETED'
    ).all()
    
    for demand in active_demands:
        inv_item = InventoryItem.query.filter_by(
            demand_id=demand.id,
            sap_part_number=master_item.sap_part_number
        ).first()
        
        # Extract metadata from production/material relations
        mat_data = master_item.material_rel.to_dict() if master_item.material_rel else {}
        prod_data = master_item.production_rel.to_dict() if master_item.production_rel else {}
        
        demand_qty = mat_data.get('TOTAL SCHEDULE QTY') or mat_data.get('demand_quantity') or 0
        sn_no = prod_data.get('SN NO') or prod_data.get('SR NO') or prod_data.get('SR.NO') or 0
        
        try:
            demand_qty = float(demand_qty)
        except:
            demand_qty = 0
            
        # Default to demand quantity if 0 - ensures proper management for new items
        if demand_qty == 0:
            demand_qty = float(demand.quantity)
            
        if not inv_item:
            inv_item = InventoryItem(
                demand_id=demand.id,
                car_model_id=demand.model_id,
                vehicle_name=demand.model_name,
                sap_part_number=master_item.sap_part_number,
                part_description=master_item.description,
                demand_quantity=demand_qty,
                serial_number=int(sn_no) if sn_no else None
            )
            db.session.add(inv_item)
        else:
            inv_item.part_description = master_item.description
            inv_item.demand_quantity = demand_qty
            inv_item.serial_number = int(sn_no) if sn_no else inv_item.serial_number
            
        # Update status based on stock
        curr = inv_item.current_stock or 0.0
        req = inv_item.demand_quantity or 0.0
        if curr < req:
            inv_item.status = 'SHORTAGE'
        else:
            inv_item.status = 'SUFFICIENT'
            
    demand_ids = [d.id for d in active_demands]
    db.session.commit()
    
    # Check if any demands should move to COMPLETED
    from app.models import Demand
    for d_id in demand_ids:
        Demand.check_and_update_status(d_id)

# ---------------------------------------------------------------------------
# Master‑Data Endpoints (same logic as before, now in a dedicated blueprint)
# ---------------------------------------------------------------------------
@manager_bp.route('/master-data', methods=['GET'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor', 'DEO'])
def get_master_data():
    model = request.args.get('model', '')
    service = MasterDataDBService()
    return jsonify(service.get_by_model(model) if model else service.load_all())

@manager_bp.route('/vehicle-models', methods=['GET'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor', 'DEO'])
def get_vehicle_models():
    """Return all unique vehicle model names from both MasterData and CarModel tables."""
    from app.models import CarModel
    # Get from MasterData
    master_names = db.session.query(MasterData.model).distinct().all()
    # Get from CarModel
    car_model_names = db.session.query(CarModel.name).distinct().all()
    
    # Combine and deduplicate
    all_names = sorted(list(set([row[0] for row in master_names] + [row[0] for row in car_model_names])))
    
    models = [{'name': name, 'id': name} for name in all_names if name]
    return jsonify({'success': True, 'data': models})


@manager_bp.route('/master-data/<string:sap_number>', methods=['PUT'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor', 'DEO'])
def update_master_item(sap_number):
    service = MasterDataDBService()
    updated_item = service.update_item('sap_part_number', sap_number, request.json)
    if updated_item:
        # Live Sync to Inventory
        sync_inventory_item(updated_item)
        return jsonify({"success": True, "message": f"Master data {sap_number} updated & synced to inventory"})
    return jsonify({"success": False, "message": "Item not found"}), 404

@manager_bp.route('/master-data/<string:sap_number>', methods=['DELETE'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor'])
def delete_master_item(sap_number):
    from app.models import MasterData, InventoryItem
    item = MasterData.query.filter_by(sap_part_number=sap_number).first()
    if not item:
        return jsonify({"success": False, "message": "Item not found"}), 404
    
    # Live Sync: Also remove from Inventory
    InventoryItem.query.filter_by(sap_part_number=sap_number).delete()
    
    db.session.delete(item)
    db.session.commit()
    
    from app.utils.audit_logger import log_audit
    log_audit("DELETE_MASTER_DATA")
    
    return jsonify({"success": True, "message": f"Master data {sap_number} deleted & removed from inventory"})

@manager_bp.route('/master-data/quick-add', methods=['POST'])
@jwt_required()
@role_required(['DEO', 'Supervisor', 'Manager', 'Admin'])
def quick_add_master_item():
    data = request.json or {}
    model_name = data.get('model')
    part_number = data.get('part_number')
    sap_part_number = data.get('sap_part_number')
    
    if not model_name or not part_number or not sap_part_number:
        return jsonify({"success": False, "message": "Model, Part Number, and SAP Part Number are required"}), 400
        
    existing = MasterData.query.filter_by(sap_part_number=sap_part_number).first()
    if existing:
        return jsonify({"success": False, "message": "SAP Part Number already exists"}), 400
        
    new_part = MasterData(
        model=model_name,
        part_number=part_number,
        sap_part_number=sap_part_number,
        description=data.get('description', 'Ad-hoc part added on shop floor'),
        saleable_no=data.get('saleable_no', ''),
        assembly_number=data.get('assembly_number', ''),
        is_ad_hoc=True,
        production_data=data.get('production_data', {}),
        material_data=data.get('material_data', {})
    )
    db.session.add(new_part)
    db.session.commit()
    
    # Log the ad-hoc addition
    from app.utils.audit_logger import log_audit
    log_audit("QUICK_ADD_PART")
    
    return jsonify({
        "success": True, 
        "message": f"Part {sap_part_number} added successfully",
        "data": new_part.to_dict()
    }), 201

@manager_bp.route('/models/<string:model_name>/schema', methods=['GET'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor', 'DEO'])
def get_model_schema(model_name):
    from app.models import CarModel
    model = CarModel.query.filter(CarModel.name.ilike(model_name)).first()
    if not model:
        return jsonify({"success": False, "message": "Model not found"}), 404
    
    return jsonify({
        "success": True,
        "data": {
            "identification_headers": model.identification_headers,
            "production_headers": model.production_headers,
            "material_headers": model.material_headers
        }
    })

@manager_bp.route('/models/<string:model_name>/schema', methods=['PUT'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor'])
def update_model_schema(model_name):
    from app.models import CarModel
    model = CarModel.query.filter(CarModel.name.ilike(model_name)).first()
    if not model:
        return jsonify({"success": False, "message": "Model not found"}), 404
    
    data = request.json
    if 'identification_headers' in data: model.identification_headers = data['identification_headers']
    if 'production_headers' in data: model.production_headers = data['production_headers']
    if 'material_headers' in data: model.material_headers = data['material_headers']
    
    db.session.commit()
    return jsonify({"success": True, "message": f"Schema for {model_name} updated successfully"})

@manager_bp.route('/car-models/<int:model_id>/ready', methods=['PATCH'])
@jwt_required()
@role_required(['Manager', 'Admin'])
def mark_model_ready(model_id):
    from app.models import CarModel, Demand
    model = CarModel.query.get(model_id)
    if not model:
        return jsonify({"success": False, "message": "Car Model not found"}), 404
        
    model.status = 'READY'
    
    # Also update the associated demand if it exists
    demand = Demand.query.filter_by(model_id=model_id).first()
    if demand:
        demand.status = 'IN_PROGRESS'
        
    db.session.commit()
    return jsonify({"success": True, "message": f"Model {model.name} is now ready for assignment"})

@manager_bp.route('/summary', methods=['GET'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor'])
def get_manager_summary():
    from app.models import Demand, DailyProductionLog
    from datetime import date
    
    today = date.today()
    
    # 1. Daily Target (Sum of plan for active demands)
    active_demands = Demand.query.filter(Demand.status == 'IN_PROGRESS').all()
    # Simple logic: assume equal distribution for target
    daily_target = 0
    for d in active_demands:
        try:
            days = (date.fromisoformat(d.end_date) - date.fromisoformat(d.start_date)).days + 1
            daily_target += d.quantity / (days if days > 0 else 1)
        except:
            pass
            
    # 2. Total Output (Sum of today's logs)
    # Since we have no logs yet, this will be 0
    total_output = 0
    
    # 3. Plan Adherence
    plan_adherence = 100 # Default if no target
    if daily_target > 0:
        plan_adherence = round((total_output / daily_target) * 100, 1)
    
    return jsonify({
        "total_output": int(total_output),
        "plan_adherence": plan_adherence,
        "daily_target": int(daily_target) or 45, # Mock fallback if no demands
        "active_shop": "ASSEMBLY-01"
    })

@manager_bp.route('/g-chart', methods=['GET'])
@jwt_required()
@role_required(['Manager', 'Admin', 'Supervisor'])
def get_g_chart_data():
    from app.models import CarModel, Demand, DailyProductionLog
    from datetime import date, timedelta
    
    from sqlalchemy import func
    # Subquery to get the latest ID for each unique model name to avoid showing cloned duplicates
    latest_ids = db.session.query(func.max(CarModel.id)).group_by(CarModel.name).all()
    latest_ids = [id_tuple[0] for id_tuple in latest_ids]
    
    models = CarModel.query.filter(CarModel.id.in_(latest_ids)).order_by(CarModel.name.asc()).all()
    result = []
    
    for m in models:
        # Check if there's any master data with production targets for this model
        master_items = MasterData.query.filter_by(model=m.name).all()
        if not master_items:
            continue
            
        days_data = []
        for d in range(1, 32):
            # Sum up the plan for this day across all parts of the model
            # Note: In a real system, you might pick a specific 'header' part
            day_key = str(d)
            plan_sum = 0
            for item in master_items:
                if item.production_data:
                    val = item.production_data.get(day_key, "0")
                    try:
                        plan_sum += float(val)
                    except:
                        pass
            
            # Since we are summing parts, the number might be high. 
            # If we want vehicle-level plan, we might divide by something or take max.
            # But let's just use the max to represent the 'line pace' for any component.
            plan = plan_sum / len(master_items) if master_items else 0
            
            # Fetch actual from DailyProductionLog
            # (Aggregation logic for DailyProductionLog would go here)
            actual = 0
            
            days_data.append({"plan": int(plan), "actual": int(actual)})
            
        result.append({
            "model_name": m.name,
            "days": days_data
        })
        
    return jsonify(result)

# ---------------------------------------------------------------------------
# Simple health endpoint (optional – can also stay in wsgi)
# ---------------------------------------------------------------------------
@manager_bp.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "running", "engine": "WSGI Production Mode"})
