from app import create_app
from app.extensions import db
from app.models import User
from sqlalchemy import text

app = create_app('dev')
with app.app_context():
    print("Standardizing user roles (removing spaces)...")
    
    # Update roles in database
    users = User.query.all()
    for user in users:
        old_role = user.role
        if ' ' in old_role:
            new_role = old_role.replace(' ', '_')
            user.role = new_role
            print(f"Updated user {user.username}: '{old_role}' -> '{new_role}'")
            
    db.session.commit()
    print("Role standardization completed.")
