import csv
import sys
from app import create_app
from app.models import db, PartMachineMapping
from datetime import datetime

app = create_app()

def seed_csv(file_path):
    with app.app_context():
        # Clear existing data just in case? Let's just insert and ignore conflicts, or truncate.
        # It's safer to clear the table first since this is a master seed
        print("Clearing existing part machine mappings...")
        db.session.query(PartMachineMapping).delete()
        db.session.commit()

        print(f"Reading CSV from {file_path}...")
        count = 0
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # CSV Columns: "id","part_number","sap_part_number","machine","created_at","updated_at"
                created_at = datetime.strptime(row['created_at'], '%Y-%m-%d %H:%M:%S.%f') if row.get('created_at') else datetime.now()
                updated_at = datetime.strptime(row['updated_at'], '%Y-%m-%d %H:%M:%S.%f') if row.get('updated_at') else datetime.now()
                
                mapping = PartMachineMapping(
                    id=int(row['id']) if row.get('id') else None,
                    part_number=row['part_number'],
                    sap_part_number=row['sap_part_number'],
                    machine=row['machine'],
                    created_at=created_at,
                    updated_at=updated_at
                )
                db.session.add(mapping)
                count += 1
                
        db.session.commit()
        print(f"Successfully seeded {count} records into part_machine_mappings.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python seed_mappings.py <csv_file>")
        sys.exit(1)
    seed_csv(sys.argv[1])
