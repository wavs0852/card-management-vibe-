import random
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, engine, Base
from app.db import models
from app.schemas.user import UserCreate
from app.services.user_service import create_user

def seed_data():
    db = SessionLocal()

    # Drop and recreate tables for a clean slate
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("Creating initial data...")

    # 1. Create Admin User
    admin_user = UserCreate(username="admin", full_name="관리자", password="adminpassword")
    create_user(db, admin_user)

    # 2. Create Student Users
    students = []
    for i in range(1, 16):
        student_user = UserCreate(username=f"student{i}", full_name=f"학생{i}", password="password123")
        created_student = create_user(db, student_user)
        students.append(created_student)

    # 3. Create Courses
    course_names = ["소프트웨어공학", "인공지능개론", "데이터베이스"]
    courses = []
    for name in course_names:
        course = models.Course(name=name)
        db.add(course)
        db.commit()
        db.refresh(course)
        courses.append(course)

    # 4. Create Teams
    teams = []
    team_count = 1
    for course in courses:
        for i in range(1, 4):
            team = models.Team(name=f"{course.name} {i}팀", course_id=course.id)
            db.add(team)
            db.commit()
            db.refresh(team)
            teams.append(team)

    # 5. Create System Settings
    db.add(models.SystemSettings(key="max_concurrent_teams", value="6"))
    db.commit()

    # 5. Assign members to teams
    random.seed(42) # for reproducible results
    team_compositions = {}

    for course in courses:
        print(f"\nAssigning teams for course: {course.name}")
        # Get the 3 teams for the current course
        course_teams = [t for t in teams if t.course_id == course.id]
        
        # For each course, shuffle the list of all 15 students
        shuffled_students = random.sample(students, len(students))

        # Partition the shuffled list into 3 teams of 5
        team_members_map = {
            course_teams[0]: shuffled_students[0:5],
            course_teams[1]: shuffled_students[5:10],
            course_teams[2]: shuffled_students[10:15]
        }

        for team, members in team_members_map.items():
            team_compositions[team.name] = []
            for student in members:
                team_member = models.TeamMember(user_id=student.id, team_id=team.id)
                db.add(team_member)
                team_compositions[team.name].append(student.username)
            db.commit()

    print("--- Initial Data Created Successfully ---")
    print("\n[Admin Account]")
    print(f"- Username: admin, Password: adminpassword")
    print("\n[Student Accounts (Total: 15)]")
    print("- All students have the same password: password123")
    print(", ".join([s.username for s in students]))
    
    print("\n[Team Compositions]")
    for team_name, members in team_compositions.items():
        print(f"- {team_name}: {', '.join(members)}")

    db.close()

if __name__ == "__main__":
    seed_data()
