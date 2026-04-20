"""
Migration: Add assigned_line_id column to users table.
Run: python migrate_user_line.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Check if column already exists
    result = db.session.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='users' AND column_name='assigned_line_id'"
    ))
    if result.fetchone():
        print("Column 'assigned_line_id' already exists in users table. No migration needed.")
    else:
        db.session.execute(text(
            "ALTER TABLE users ADD COLUMN assigned_line_id INTEGER "
            "REFERENCES production_lines(id) ON DELETE SET NULL"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_users_assigned_line_id ON users(assigned_line_id)"
        ))
        db.session.commit()
        print("SUCCESS: Added 'assigned_line_id' column to users table.")
    
    # Verify
    result = db.session.execute(text("SELECT id, username, role, assigned_line_id FROM users LIMIT 10"))
    rows = result.fetchall()
    print(f"\nCurrent users ({len(rows)} shown):")
    for r in rows:
        print(f"  id={r[0]}, username={r[1]}, role={r[2]}, assigned_line_id={r[3]}")
