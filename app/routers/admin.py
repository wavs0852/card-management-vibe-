from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.core.dependencies import get_db, get_current_user
from app.services import admin_service
from app.schemas import course as course_schema, team as team_schema, user as user_schema, setting as setting_schema, reservation as reservation_schema

router = APIRouter()

def get_current_admin_user(current_user: user_schema.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

# ... existing admin routes for courses and teams ...
@router.post("/courses", response_model=course_schema.Course, dependencies=[Depends(get_current_admin_user)])
def create_course(course: course_schema.CourseCreate, db: Session = Depends(get_db)):
    return admin_service.create_course(db=db, course=course)

@router.post("/teams", response_model=team_schema.Team, dependencies=[Depends(get_current_admin_user)])
def create_team(team: team_schema.TeamBase, course_id: int, db: Session = Depends(get_db)):
    return admin_service.create_team(db=db, team=team, course_id=course_id)

@router.post("/teams/{team_id}/members/{user_id}", dependencies=[Depends(get_current_admin_user)])
def add_team_member(team_id: int, user_id: int, db: Session = Depends(get_db)):
    return admin_service.add_team_member(db=db, team_id=team_id, user_id=user_id)

# New routes for settings and reservation viewing
@router.get("/settings", response_model=List[setting_schema.Setting], dependencies=[Depends(get_current_admin_user)])
def get_settings(db: Session = Depends(get_db)):
    return admin_service.get_settings(db)

@router.put("/settings", response_model=setting_schema.Setting, dependencies=[Depends(get_current_admin_user)])
def update_setting(setting: setting_schema.Setting, db: Session = Depends(get_db)):
    return admin_service.update_setting(db=db, setting=setting)

@router.get("/reservations-by-date", response_model=List[reservation_schema.Reservation], dependencies=[Depends(get_current_admin_user)])
def get_reservations_by_date(reservation_date: date, db: Session = Depends(get_db)):
    return admin_service.get_reservations_by_date(db=db, reservation_date=reservation_date)
