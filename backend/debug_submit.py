import traceback
from datetime import datetime
from app import create_app, db
from app.models import InventoryItem, RMCheckRequest, User, Notification

app = create_app()
app.app_context().push()

item_id = 736
data = {
    'rm_thk_mm': '1',
    'sheet_width': '1',
    'sheet_length': '1',
    'no_of_comp_per_sheet': '1',
    'rm_size': '0',
    'rm_grade': '1',
    'act_rm_sizes': '0',
    'ppc_notes': 'test'
}

try:
    user = User.query.filter_by(role='PPC_Planner').first()
    item = InventoryItem.query.get(item_id)
    
    print(f"Processing for user {user.username if user else 'None'} item {item.sap_part_number if item else 'None'}")
    
    count = RMCheckRequest.query.count() + 1
    formatted_id = f"RMR-{count:04d}"
    
    rm_req = RMCheckRequest(
        formatted_id=formatted_id,
        inventory_item_id=item.id,
        demand_id=item.demand_id,
        ppc_planner_id=user.id,
        rm_thk_mm=data.get('rm_thk_mm'),
        sheet_width=data.get('sheet_width'),
        sheet_length=data.get('sheet_length'),
        no_of_comp_per_sheet=data.get('no_of_comp_per_sheet'),
        rm_size=data.get('rm_size'),
        rm_grade=data.get('rm_grade'),
        act_rm_sizes=data.get('act_rm_sizes'),
        ppc_notes=data.get('ppc_notes'),
        status='SUBMITTED',
        submitted_at=datetime.utcnow(),
    )
    db.session.add(rm_req)
    
    item.rm_status = 'RM_SUBMITTED'
    db.session.flush()
    print("Flushed correctly. Attempting notifications...")
    
    store_keepers = User.query.filter_by(role='Store_Keeper', is_active=True).all()
    print(f"Found {len(store_keepers)} active store keepers.")
    
    for sk in store_keepers:
        Notification.send(
            user_id=sk.id,
            title="New RM Sheet Submitted",
            message=f"Test Notification",
            notification_type='RM_SUBMITTED',
            demand_id=item.demand_id,
            rm_request_id=rm_req.id
        )
    
    db.session.commit()
    print("SUCCESS: Transaction committed perfectly!")
    print("Dict conversion test:", rm_req.to_dict() is not None)
except Exception as e:
    db.session.rollback()
    traceback.print_exc()
