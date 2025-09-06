from pydantic import BaseModel
from typing import Optional, List
from .team import Team

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

# This schema is for reading user data, used in responses
class User(UserBase):
    id: int
    is_admin: bool

    class Config:
        from_attributes = True

# A more complete User schema for the /users/me endpoint
class UserDetails(User):
    assigned_teams: List[Team] = []
