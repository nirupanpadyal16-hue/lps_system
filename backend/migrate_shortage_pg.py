import sys
import argparse
sys.path.insert(0, 'backend')
from app import create_app, db

app = create_app()

def upgrade():
    with app.app_context():
        try:
            # 1. Add columns to part_shortage_requests
            try:
                db.session.execute(db.text("ALTER TABLE part_shortage_requests ADD COLUMN supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
                print("Added supervisor_id")
            except Exception as e:
                db.session.rollback()
                print("supervisor_id might already exist or error:", e)

            try:
                db.session.execute(db.text("ALTER TABLE part_shortage_requests ADD COLUMN line_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL"))
                print("Added line_id")
            except Exception as e:
                db.session.rollback()
                print("line_id might already exist or error:", e)

            # 2. Create the shortage_daily_entries table
            # Since models.py is loaded, we can just do db.create_all() which creates missing tables
            db.create_all()
            print("Running db.create_all() to ensure table exists.")
            
            db.session.commit()
            print("Migration successful: added supervisor_id, line_id and shortage_daily_entries table.")
        except Exception as e:
            db.session.rollback()
            print("Migration failed:", e)

if __name__ == "__main__":
    upgrade()
