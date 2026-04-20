import os
import sys
import json

# Add the current directory to the path so we can import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import MasterData, InventoryItem

def update_descriptions():
    app = create_app('dev')
    with app.app_context():
        print("[UPDATE] Starting MasterData description update from JSON dump...")
        
        # Load JSON data
        try:
            with open('master_data_dump.json', 'r') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Failed to load JSON dump: {e}")
            return
            
        # Create a mapping dictionary for faster lookups
        sap_to_desc = {}
        for row in data:
            sap = str(row.get('sap', '')).strip()
            desc = row.get('desc')
            if sap and desc:
                sap_to_desc[sap] = desc
                
        print(f"[UPDATE] Loaded {len(sap_to_desc)} unique descriptions from Excel data.")
        
        # Update MasterData
        master_items = MasterData.query.all()
        updated_master = 0
        
        for item in master_items:
            sap = str(item.sap_part_number).strip() if item.sap_part_number else ''
            if sap in sap_to_desc:
                # Update if description is None or empty or we just want to sync it
                if item.description != sap_to_desc[sap]:
                    item.description = sap_to_desc[sap]
                    updated_master += 1

        print(f"[UPDATE] Updated {updated_master} MasterData descriptions.")
        
        # Update InventoryItems (to keep them in sync with master data)
        inventory_items = InventoryItem.query.all()
        updated_inventory = 0
        
        for inv in inventory_items:
            sap = str(inv.sap_part_number).strip() if inv.sap_part_number else ''
            if sap in sap_to_desc:
                if inv.part_description != sap_to_desc[sap]:
                    inv.part_description = sap_to_desc[sap]
                    updated_inventory += 1
                    
        print(f"[UPDATE] Updated {updated_inventory} InventoryItem descriptions.")

        db.session.commit()
        print("[SUCCESS] Database updated successfully!")

if __name__ == "__main__":
    update_descriptions()
