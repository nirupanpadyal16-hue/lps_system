import sqlite3

def upgrade():
    conn = sqlite3.connect('backend/instance/lps.db')
    cursor = conn.cursor()

    try:
        # Add columns to part_shortage_requests
        try:
            cursor.execute("ALTER TABLE part_shortage_requests ADD COLUMN supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                print(f"Error adding supervisor_id: {e}")
        try:
            cursor.execute("ALTER TABLE part_shortage_requests ADD COLUMN line_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                print(f"Error adding line_id: {e}")

        # Create shortage_daily_entries table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS shortage_daily_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shortage_request_id INTEGER NOT NULL REFERENCES part_shortage_requests(id) ON DELETE CASCADE,
            deo_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            date DATE NOT NULL,
            sap_stock FLOAT DEFAULT 0.0,
            opening_stock FLOAT DEFAULT 0.0,
            todays_stock FLOAT DEFAULT 0.0,
            notes TEXT,
            status VARCHAR(30) DEFAULT 'PENDING_SUPERVISOR',
            rejection_reason TEXT,
            verified_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        conn.commit()
        print("Migration successful: added supervisor_id, line_id and shortage_daily_entries table.")
    except Exception as e:
        conn.rollback()
        print("Migration failed:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade()
