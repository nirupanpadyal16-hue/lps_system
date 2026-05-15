"""
run_schema_patch.py
Safe migration: adds new columns to dispatch_records table if they don't already exist.
Run once: python run_schema_patch.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db
from sqlalchemy import text

NEW_COLUMNS = [
    ("vehicle_name",     "VARCHAR(100)"),
    ("vehicle_number",   "VARCHAR(50)"),
    ("driver_name",      "VARCHAR(100)"),
    ("driver_contact",   "VARCHAR(50)"),
    ("transporter_name", "VARCHAR(150)"),
]

def column_exists(conn, table, col):
    try:
        result = conn.execute(text(
            f"SELECT column_name FROM information_schema.columns "
            f"WHERE table_name='{table}' AND column_name='{col}'"
        ))
        return result.fetchone() is not None
    except Exception:
        # SQLite fallback
        result = conn.execute(text(f"PRAGMA table_info({table})"))
        cols = [r[1] for r in result.fetchall()]
        return col in cols

def run():
    app = create_app()
    with app.app_context():
        with db.engine.connect() as conn:
            for col_name, col_type in NEW_COLUMNS:
                if not column_exists(conn, "dispatch_records", col_name):
                    print(f"  Adding column: {col_name} ...")
                    conn.execute(text(
                        f"ALTER TABLE dispatch_records ADD COLUMN {col_name} {col_type}"
                    ))
                    print(f"  [OK] {col_name} added.")
                else:
                    print(f"  [OK] {col_name} already exists, skipping.")
            conn.commit()
    print("\nSchema patch complete.")

if __name__ == "__main__":
    run()
