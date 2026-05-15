from app import create_app, db
from sqlalchemy import text

app = create_app()
app.app_context().push()

try:
    with db.engine.connect() as conn:
        conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS shortage_request_id INTEGER REFERENCES part_shortage_requests(id) ON DELETE SET NULL;"))
        conn.commit()
    print("SUCCESS: Altered table notifications added shortage_request_id")
except Exception as e:
    print("ERROR:", e)
