"""
Migration: Create inventory_items and part_shortage_requests tables.
Safe to run against existing DB - uses create_all with checkfirst=True.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import InventoryItem, PartShortageRequest

app = create_app()

with app.app_context():
    print("Creating inventory tables...")
    
    # Create only the new tables (won't touch existing ones)
    db.engine.dialect.has_table(db.engine.connect(), 'inventory_items')
    
    InventoryItem.__table__.create(db.engine, checkfirst=True)
    print("  [OK] inventory_items table ready")
    
    PartShortageRequest.__table__.create(db.engine, checkfirst=True)
    print("  [OK] part_shortage_requests table ready")

    print("\n[OK] Inventory migration complete!")
    print("   Tables: inventory_items, part_shortage_requests")
