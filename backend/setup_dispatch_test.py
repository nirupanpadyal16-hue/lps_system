import os
import sys
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db
from app.models import User, Demand, InventoryItem, DispatchRecord, Status

def run():
    app = create_app()
    with app.app_context():
        print("Setting up mock completed demand for Dispatch UI test...")
        
        # 1. Get or create test user
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Admin user not found!")
            return
            
        # 2. Clean up any old test demands to avoid clutter
        old_demands = Demand.query.filter_by(model_name='UI_TEST_BOLERO').all()
        for d in old_demands:
            print(f"Deleting old UI TEST demand {d.formatted_id}")
            InventoryItem.query.filter_by(demand_id=d.id).delete()
            db.session.delete(d)
        db.session.commit()

        # 3. Create a brand new demand that is PRODUCTION_DONE
        count = Demand.query.count() + 1
        formatted_id = f"DEM-{count:03d}"
        
        demand = Demand(
            formatted_id=formatted_id,
            model_name='UI_TEST_BOLERO',
            quantity=10,
            start_date=date.today().strftime('%Y-%m-%d'),
            end_date=date.today().strftime('%Y-%m-%d'),
            status='PRODUCTION_DONE',  # Pre-set to finished status!
            line='LINE A',
            manager=admin.name,
            customer='Visual Test Corp',
            company='CIE Automotive',
            is_deleted=False
        )
        db.session.add(demand)
        db.session.flush() # Generate demand.id
        
        print(f"Created demand {formatted_id} in PRODUCTION_DONE status.")

        # 4. Create associated inventory items with low initial stock (so dispatch deduction is visible)
        item = InventoryItem(
            demand_id=demand.id,
            sap_part_number='PTM-UI-TEST',
            part_description='Test Bracket for Dispatch',
            demand_quantity=10,
            initial_stock=100,
            current_stock=100, # Will be 90 after dispatch
            status='PRODUCTION_DONE',
            rm_status='RM_ACCEPTED',
            serial_number=1
        )
        db.session.add(item)
        db.session.commit()
        
        print(f"Setup complete! Demand ID: {demand.id}, Formatted: {demand.formatted_id}")
        print("Ready for visual testing of Step 6 (Send to Dispatch) and Step 7 (Execute Dispatch).")

if __name__ == "__main__":
    run()
