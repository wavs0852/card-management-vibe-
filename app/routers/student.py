from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.services import reservation_service
from app.schemas import reservation as reservation_schema
from app.schemas import user as user_schema

router = APIRouter()

@router.post("/reservations", response_model=reservation_schema.Reservation)
def create_reservation(
    reservation: reservation_schema.ReservationCreate,
    db: Session = Depends(get_db),
    current_user: user_schema.User = Depends(get_current_user)
):
    """Create a new reservation for the current user's team."""
    return reservation_service.create_reservation(db=db, reservation=reservation, user_id=current_user.id)

@router.get("/reservations", response_model=List[reservation_schema.Reservation])
def get_reservations(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: user_schema.User = Depends(get_current_user) # Ensures endpoint is protected
):
    """Get all reservations for a given year and month."""
    return reservation_service.get_reservations_for_month(db=db, year=year, month=month)
