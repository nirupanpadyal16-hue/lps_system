"""
Migration script: Add new columns and tables for PPC Planner / Store Keeper.
Run from lps_system root: python migrate.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Load env from backend/.env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app('dev')

with app.app_context():
    with db.engine.connect() as conn:
        migrations = [
            # ── users table ─────────────────────────────────────────────────
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_machine_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL",

            # ── inventory_items table ────────────────────────────────────────
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS initial_stock FLOAT DEFAULT 0.0",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS produced_qty  FLOAT DEFAULT 0.0",
            "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS rm_status     VARCHAR(30) DEFAULT 'PENDING'",

            # Sync legacy current_stock = initial_stock + produced_qty for existing rows
            "UPDATE inventory_items SET initial_stock = current_stock WHERE initial_stock = 0 AND current_stock > 0",
        ]

        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  OK : {sql[:70]}")
            except Exception as e:
                conn.rollback()
                print(f"  SKIP: {str(e)[:80]}")

    # Create all new tables (rm_check_requests, dispatch_records, machine_production_entries, notifications)
    db.create_all()
    print("\nAll new tables created successfully.")
    print("Migration complete!")
