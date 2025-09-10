from pydantic import BaseModel, Field
from datetime import date
from typing import List

from app.db.models import TimeSlot
from .user import User
from .team import Team

class ReservationBase(BaseModel):
    reservation_date: date
    time_slot: TimeSlot
    team_id: int

class ReservationCreate(ReservationBase):
    participant_ids: List[int] = Field(..., min_length=1)

# Schema for displaying participant details in reservation info
class ReservationParticipantInfo(BaseModel):
    user: User
    class Config:
        from_attributes = True

# Schema for displaying reservation details, especially for admins
class ReservationDetails(ReservationBase):
    id: int
    team: Team
    participants: List[ReservationParticipantInfo]

    class Config:
        from_attributes = True

# Basic reservation info for student view
class Reservation(ReservationBase):
    id: int
    is_confirmed: bool

    class Config:
        from_attributes = True
