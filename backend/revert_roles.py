from app import create_app
from app.extensions import db
from app.models import User

app = create_app('dev')
with app.app_context():
    print("Reverting user roles (adding spaces back)...")
    
    # Revert roles in database
    users = User.query.all()
    for user in users:
        if user.username == 'ppc':
            user.role = 'PPC Planner'
            print(f"Reverted user {user.username}: -> 'PPC Planner'")
        if user.username == 'store':
            user.role = 'Store Keeper'
            print(f"Reverted user {user.username}: -> 'Store Keeper'")
            
    db.session.commit()
    print("Role reversion completed.")
