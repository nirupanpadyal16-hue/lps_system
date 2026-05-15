import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db

def run():
    app = create_app()
    with app.app_context():
        print("Starting database migration patch: increasing status column to VARCHAR(50)")
        try:
            db.session.execute(text("ALTER TABLE demands ALTER COLUMN status TYPE character varying(50);"))
            db.session.commit()
            print("SUCCESS: Migrated demands table status column to VARCHAR(50)!")
        except Exception as e:
            db.session.rollback()
            print(f"ERROR running migration: {str(e)}")
            
if __name__ == "__main__":
    run()
