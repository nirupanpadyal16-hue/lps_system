from sqlalchemy import create_engine, text

# Connection details from perfect_db.py
DATABASE_URL = "postgresql://postgres:98165mkm@localhost:5432/lps_raj"

def migrate():
    engine = create_engine(DATABASE_URL)
    cols = [
        "machine",
        "no_of_machines",
        "strokes_per_part",
        "part_weight",
        "today_produced"
    ]
    
    with engine.connect() as conn:
        print("Connecting to database...")
        for col in cols:
            try:
                print(f"Adding column: {col}...")
                conn.execute(text(f"ALTER TABLE production_data ADD COLUMN {col} VARCHAR(100)"))
                print(f"Successfully added {col}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"Column {col} already exists, skipping.")
                else:
                    print(f"Error adding {col}: {e}")
        conn.commit()
        print("Migration complete!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"FAILED: {e}")
