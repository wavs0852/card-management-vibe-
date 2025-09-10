from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from datetime import date

from app.db import models
from app.schemas import course as course_schema, team as team_schema, setting as setting_schema, reservation as reservation_schema

def get_settings(db: Session):
    return db.query(models.SystemSettings).all()

def update_setting(db: Session, setting: setting_schema.Setting):
    db_setting = db.query(models.SystemSettings).filter(models.SystemSettings.key == setting.key).first()
    if not db_setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Setting '{setting.key}' not found")
    db_setting.value = setting.value
    db.commit()
    db.refresh(db_setting)
    return db_setting

def get_reservations_by_month(db: Session, year: int, month: int):
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

    return db.query(models.Reservation).options(
        joinedload(models.Reservation.team),
        joinedload(models.Reservation.participants).joinedload(models.ReservationParticipant.user)
    ).filter(
        models.Reservation.reservation_date >= start_date,
        models.Reservation.reservation_date < end_date
    ).order_by(models.Reservation.time_slot).all()

def create_course(db: Session, course: course_schema.CourseCreate):
    db_course = models.Course(name=course.name)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

def create_team(db: Session, team: team_schema.TeamBase, course_id: int):
    db_team = models.Team(name=team.name, course_id=course_id)
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

def add_team_member(db: Session, team_id: int, user_id: int):
    # Check if user and team exist
    user = db.query(models.User).filter(models.User.id == user_id).first()
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not user or not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User or Team not found")

    db_team_member = models.TeamMember(user_id=user_id, team_id=team_id)
    db.add(db_team_member)
    db.commit()
    db.refresh(db_team_member)
    return db_team_member
