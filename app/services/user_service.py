from sqlalchemy.orm import Session
from app.db import models
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    # If username is 'admin', make them an admin user.
    is_admin = True if user.username == 'admin' else False
    db_user = models.User(
        username=user.username, 
        full_name=user.full_name, 
        password=hashed_password, 
        is_admin=is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user