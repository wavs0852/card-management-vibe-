from sqlalchemy import Column, Integer, String, ForeignKey, Date, Boolean, Enum as PyEnum
from sqlalchemy.orm import relationship
from .database import Base
import enum

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False) # Hashed password
    full_name = Column(String)
    is_admin = Column(Boolean, default=False)
    teams = relationship("TeamMember", back_populates="user")

    @property
    def assigned_teams(self):
        return [tm.team for tm in self.teams]

class Team(Base):
    __tablename__ = 'teams'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id'))
    course = relationship("Course")
    members = relationship("TeamMember", back_populates="team")

    @property
    def member_details(self):
        return [tm.user for tm in self.members]

class TeamMember(Base):
    __tablename__ = 'team_members'
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    team_id = Column(Integer, ForeignKey('teams.id'), primary_key=True)
    user = relationship("User", back_populates="teams")
    team = relationship("Team", back_populates="members")

class Course(Base):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

class TimeSlot(str, enum.Enum):
    MORNING = "MORNING"
    LUNCH = "LUNCH"
    DINNER = "DINNER"

class Reservation(Base):
    __tablename__ = 'reservations'
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=False)
    reservation_date = Column(Date, nullable=False)
    time_slot = Column(PyEnum(TimeSlot), nullable=False)
    is_confirmed = Column(Boolean, default=False)
    team = relationship("Team")
    participants = relationship("ReservationParticipant", back_populates="reservation")

class ReservationParticipant(Base):
    __tablename__ = 'reservation_participants'
    reservation_id = Column(Integer, ForeignKey('reservations.id'), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    reservation = relationship("Reservation", back_populates="participants")
    user = relationship("User")

class SystemSettings(Base):
    __tablename__ = 'system_settings'
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False)
