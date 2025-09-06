from pydantic import BaseModel
from typing import List, Optional

# A simple schema for user details to be nested in Team
class UserInTeam(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True

class TeamBase(BaseModel):
    name: str

class Team(TeamBase):
    id: int
    member_details: List[UserInTeam] = []

    class Config:
        from_attributes = True
