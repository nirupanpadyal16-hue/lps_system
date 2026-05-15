import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db
from app.models import CarModel, MasterData, ProductionLine, PartMachineMapping, User, ProductionData

def run():
    app = create_app()
    with app.app_context():
        print("Pre-registering 'E2E_TEST_CAR' securely for 1-part visual testing...")
        
        # Cleanup
        db.session.execute(db.text("DELETE FROM master_data WHERE model = 'E2E_TEST_CAR'"))
        db.session.execute(db.text("DELETE FROM car_models WHERE name = 'E2E_TEST_CAR'"))
        db.session.commit()
        
        # Fetch dependencies
        line = ProductionLine.query.first() # ID 9: 320T
        deo = User.query.filter_by(role='DEO').first()
        supervisor = User.query.filter_by(role='Supervisor').first()
        
        if not line or not deo or not supervisor:
            print("CRITICAL: Missing active users/lines in DB to seed model!")
            return
            
        print(f"Binding to ProductionLine: {line.name}, Assigned DEO: {deo.username}, Supervisor: {supervisor.username}")
        
        # 1. Create test car
        test_car = CarModel(
            name='E2E_TEST_CAR',
            model_code='E2E-CAR-V1',
            type='SUV',
            production_line_id=line.id,
            assigned_deo_id=deo.id,
            supervisor_id=supervisor.id,
            status='ACTIVE'
        )
        db.session.add(test_car)
        db.session.flush()
        
        # 2. Create single MasterData part
        md = MasterData(
            model='E2E_TEST_CAR',
            part_number='PART-E2E-XYZ',
            sap_part_number='SAP-E2E-XYZ',
            description='Visual Single-Part Bracket',
        )
        db.session.add(md)
        db.session.flush()
        
        # 3. Attach ProductionData (holds machine linkage)
        pd = ProductionData(
            master_data_id=md.id,
            machine=line.name
        )
        db.session.add(pd)
        
        # 4. Connect mapping
        existing_map = PartMachineMapping.query.filter_by(sap_part_number='SAP-E2E-XYZ').first()
        if existing_map:
            db.session.delete(existing_map)
            
        mapping = PartMachineMapping(
            part_number='PART-E2E-XYZ',
            sap_part_number='SAP-E2E-XYZ',
            machine=line.name
        )
        db.session.add(mapping)
        
        db.session.commit()
        print("SUCCESS: Registered 'E2E_TEST_CAR' with exactly ONE part bound to physical machine!")
        print("The entire flow can now be tested in minutes with 100% visual parity!")

if __name__ == "__main__":
    run()
