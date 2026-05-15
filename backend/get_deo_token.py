from app import create_app, db
from app.models.models import User
from flask_jwt_extended import create_access_token

app = create_app()
with app.app_context():
    user = User.query.filter_by(role='DEO').first()
    token = create_access_token(identity=user.username)
    print(token)
