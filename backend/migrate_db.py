import os
from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app('dev')
with app.app_context():
    print("Migrating database lps_raj (adding missing columns)...")
    
    # List of SQL statements to add missing columns
    migration_sqls = [
        # User table
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_machine_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL;",
        
        # InventoryItem table
        "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS initial_stock FLOAT DEFAULT 0.0;",
        "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS produced_qty FLOAT DEFAULT 0.0;",
        "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS rm_status VARCHAR(30) DEFAULT 'PENDING';",
    ]
    
    for sql in migration_sqls:
        try:
            db.session.execute(text(sql))
            print(f"Executed: {sql}")
        except Exception as e:
            print(f"Error executing {sql}: {e}")
            
    db.session.commit()
    print("Migration completed.")
