from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status

from app.db import models
from app.schemas import reservation as reservation_schema

def get_reservations_for_month(db: Session, year: int, month: int):
    # A more robust way would be to use calendar month range
    return db.query(models.Reservation).filter(
        and_(
            models.Reservation.reservation_date >= f"{year}-{month:02d}-01",
            models.Reservation.reservation_date <= f"{year}-{month:02d}-31"
        )
    ).all()

def create_reservation(db: Session, reservation: reservation_schema.ReservationCreate, user_id: int):
    # 1. Check if the requesting user is in the list of participants
    if user_id not in reservation.participant_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a participant to create a reservation.")

    # 2. Check if all participants are members of the selected team
    team_members_query = db.query(models.TeamMember.user_id).filter(models.TeamMember.team_id == reservation.team_id).all()
    team_member_ids = {member.user_id for member in team_members_query}
    if not set(reservation.participant_ids).issubset(team_member_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All participants must be members of the selected team.")

    # 3. Check if the team has already booked today (any time slot)
    existing_booking_for_team = db.query(models.Reservation).filter(
        models.Reservation.team_id == reservation.team_id,
        models.Reservation.reservation_date == reservation.reservation_date
    ).first()
    if existing_booking_for_team:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This team has already booked for {existing_booking_for_team.time_slot.value} on this day."
        )

    # 4. Check for member conflicts for the selected participants
    # First, check against the concurrent team limit
    try:
        max_teams_setting = db.query(models.SystemSettings).filter(models.SystemSettings.key == "max_concurrent_teams").first()
        max_teams = int(max_teams_setting.value)
    except (AttributeError, ValueError):
        max_teams = 6 # Default value if not set or invalid

    reservations_at_same_time = db.query(models.Reservation).filter(
        models.Reservation.reservation_date == reservation.reservation_date,
        models.Reservation.time_slot == reservation.time_slot
    ).count()

    if reservations_at_same_time >= max_teams:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Booking failed. The maximum number of teams ({max_teams}) for this time slot has been reached."
        )

    # Now, check for individual member conflicts
    conflicting_reservations = db.query(models.Reservation).join(models.ReservationParticipant).filter(
        models.Reservation.reservation_date == reservation.reservation_date,
        models.Reservation.time_slot == reservation.time_slot,
        models.ReservationParticipant.user_id.in_(reservation.participant_ids)
    ).all()

    if conflicting_reservations:
        conflicting_users = set()
        for res in conflicting_reservations:
            for p in res.participants:
                if p.user_id in reservation.participant_ids:
                    conflicting_users.add(p.user.full_name)
        
        if conflicting_users:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Booking failed. The following members already have a reservation at this time: {', '.join(sorted(list(conflicting_users)))}"
            )

    # All checks passed, create the reservation and participants
    db_reservation = models.Reservation(
        reservation_date=reservation.reservation_date,
        time_slot=reservation.time_slot,
        team_id=reservation.team_id
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)

    for p_id in reservation.participant_ids:
        participant = models.ReservationParticipant(reservation_id=db_reservation.id, user_id=p_id)
        db.add(participant)
    
    db.commit()
    db.refresh(db_reservation)

    return db_reservation
