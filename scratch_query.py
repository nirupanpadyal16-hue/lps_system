import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
from app import create_app
from app.extensions import db

app = create_app('dev')
with app.app_context():
    meta = db.metadata
    for table_name in sorted(meta.tables):
        res = db.session.execute(db.text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
        print(f"{table_name:<40} {res:>5} rows")
