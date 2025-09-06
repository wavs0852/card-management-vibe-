from pydantic import BaseModel, Field
from datetime import date
from typing import List, Optional
from app.db.models import TimeSlot
from .user import User # Import User schema for response

class ReservationBase(BaseModel):
    reservation_date: date
    time_slot: TimeSlot
    team_id: int

class ReservationCreate(ReservationBase):
    participant_ids: List[int] = Field(..., min_length=1)

class ReservationParticipant(BaseModel):
    user: User
    class Config:
        from_attributes = True

class Reservation(ReservationBase):
    id: int
    is_confirmed: bool
    participants: List[ReservationParticipant]

    class Config:
        from_attributes = True
