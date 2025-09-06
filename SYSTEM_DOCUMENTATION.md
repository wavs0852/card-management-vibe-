# 공유 카드 관리 시스템 기술 문서

## 1. 개요

본 문서는 전주대학교 AI학과 학생들의 식비 지원을 위한 '공유 카드 관리 시스템'의 기술적인 설계와 구현 계획을 정의합니다. 시스템은 FastAPI 기반의 백엔드와 Jinja2를 사용한 서버 사이드 렌더링 프론트엔드로 구성됩니다.

### 1.1. 주요 목표
- 팀 단위 카드 사용 신청 및 예약 관리 자동화
- 관리자를 위한 웹 기반의 직관적인 시스템 운영 도구 제공
- 중복 예약 및 자원 충돌 방지를 위한 체계적인 비즈니스 로직 구현

---

## 2. 기술 스택

- **Backend**: FastAPI, Uvicorn
- **Database**: SQLite (개발용), SQLAlchemy (ORM)
- **Authentication**: JWT (JSON Web Tokens), `python-jose[cryptography]`, `passlib[bcrypt]`
- **Frontend**: Jinja2 Templates, HTML, CSS, JavaScript
- **Python Environment**: `uv` (권장)

---

## 3. 프로젝트 디렉토리 구조

프로젝트의 유지보수성과 확장성을 고려하여 다음과 같은 구조를 제안합니다.

```
/card-management-system
|
├── app/
|   ├── __init__.py
|   ├── main.py             # FastAPI 애플리케이션 초기화 및 라우터 등록
|   |
|   ├── core/
|   |   ├── config.py       # 환경 변수 및 설정 관리
|   |   ├── dependencies.py # 의존성 주입 (e.g., DB 세션, 인증된 사용자)
|   |   └── security.py     # 비밀번호 해싱, JWT 생성/검증 유틸리티
|   |
|   ├── db/
|   |   ├── database.py     # 데이터베이스 연결 및 세션 설정
|   |   └── models.py       # SQLAlchemy 모델(테이블) 정의
|   |
|   ├── schemas/
|   |   └── reservation.py  # Pydantic 스키마 (데이터 유효성 검사)
|   |   └── team.py
|   |   └── user.py
|   |   └── token.py        # JWT 토큰 스키마
|   |
|   ├── services/
|   |   └── reservation_service.py # 핵심 비즈니스 로직 (예약 검증, 생성, 취소)
|   |   └── user_service.py
|   |
|   ├── routers/
|   |   ├── admin.py        # 관리자용 API 라우터
|   |   └── student.py      # 학생용 API 라우터
|   |   └── auth.py         # 인증 관련 라우터
|   |
|   ├── templates/          # Jinja2 템플릿
|   |   ├── admin/
|   |   |   └── dashboard.html
|   |   └── student/
|   |   |   └── reservation.html
|   |   └── auth/
|   |   |   └── login.html    # 로그인 페이지
|   |   └── index.html
|   |   └── layout.html
|   |
|   └── static/             # CSS, JS, 이미지 파일
|       ├── css/
|       |   └── style.css
|       └── js/
|           └── main.js
|           └── auth.js       # JWT 처리 및 세션 관리
|
├── tests/                  # 테스트 코드
|   └── test_reservations.py
|
└── requirements.txt        # Python 패키지 의존성
└── .env                    # 환경 변수 파일
```

---

## 4. 데이터베이스 스키마 (SQLAlchemy Models)

`app/db/models.py` 파일에 정의될 SQLAlchemy 모델입니다. (변경 없음)

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Date, Time, Boolean, Enum
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False) # Hashed password
    full_name = Column(String)
    is_admin = Column(Boolean, default=False)
    teams = relationship("TeamMember", back_populates="user")

class Team(Base):
    __tablename__ = 'teams'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id'))
    course = relationship("Course")
    members = relationship("TeamMember", back_populates="team")

class TeamMember(Base):
    __tablename__ = 'team_members'
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    team_id = Column(Integer, ForeignKey('teams.id'), primary_key=True)
    user = relationship("User", back_populates="teams")
    team = relationship("Team", back_populates="members")

class Course(Base):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

class TimeSlot(enum.Enum):
    MORNING = "아침"
    LUNCH = "점심"
    DINNER = "저녁"

class Reservation(Base):
    __tablename__ = 'reservations'
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=False)
    reservation_date = Column(Date, nullable=False)
    time_slot = Column(Enum(TimeSlot), nullable=False)
    is_confirmed = Column(Boolean, default=False)
    team = relationship("Team")

class SystemSettings(Base):
    __tablename__ = 'system_settings'
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False) # e.g., key='max_concurrent_teams', value='6'
```

---

## 5. API 엔드포인트 (FastAPI)

모든 학생 및 관리자 API는 JWT 인증을 필요로 합니다.

### 5.1. 인증 API (`/auth`)
- **`POST /token`**: 로그인 및 JWT 토큰 발급
  - **Request Body**: `application/x-www-form-urlencoded` 형식의 `username` 및 `password`
  - **Response Body**: `{ "access_token": "...", "token_type": "bearer" }`
- **`GET /users/me`**: 현재 로그인된 사용자 정보 조회
  - **Authentication**: JWT Bearer Token 필요
  - **Response Body**: 사용자 정보 및 소속된 팀 목록 (`teams` 관계를 통해 조회)

### 5.2. 학생용 API (`/student`) - (보호됨)
- **`POST /reservations`**: 새 예약 신청
- **`GET /reservations`**: 자신의 예약 목록 조회
- **`DELETE /reservations/{reservation_id}`**: 예약 취소

### 5.3. 관리자용 API (`/admin`) - (보호됨)
- **`GET /dashboard`**: 관리자 대시보드 데이터 조회
- **`POST /teams`**: 새 팀 생성 및 팀원 할당
- **`PUT /teams/{team_id}`**: 팀 정보 수정
- **`GET /settings`**: 시스템 설정 조회
- **`PUT /settings`**: 시스템 설정 수정
- **`POST /restrictions`**: 특정 날짜/시간 사용 제한 설정

---

## 6. 프론트엔드 아키텍처 (Jinja2)

- **`layout.html`**: 모든 페이지의 기본 레이아웃. 로그인 상태에 따라 네비게이션 메뉴 변경.
- **`auth/login.html`**: 사용자 ID와 비밀번호를 입력받는 로그인 폼 페이지.
- **학생 인터페이스**:
  - `reservation.html`: 캘린더 UI를 통해 예약을 신청하는 페이지. 사용자가 예약 가능한 시간대를 클릭하면, **로그인된 사용자가 현재 소속된 팀 목록만** 선택지로 나타나며, 이 중에서 하나를 선택하여 예약을 진행합니다.
- **관리자 인터페이스**:
  - `dashboard.html`: 통합 대시보드.
  - `team_management.html`: 팀 관리 페이지.
  - `settings.html`: 시스템 설정 페이지.

---

## 7. 핵심 비즈니스 로직 구현

### 7.1. 예약 검증 로직 (`reservation_service.py`)
(변경 없음)

### 7.2. 자동화된 정책
(변경 없음)

---

## 8. 인증 및 세션 관리

### 8.1. 인증 흐름
1.  사용자가 `auth/login.html` 페이지에서 ID와 비밀번호를 제출합니다.
2.  프론트엔드 JavaScript가 `/auth/token` 엔드포인트로 로그인 요청을 보냅니다.
3.  서버는 사용자 인증 후 JWT(Access Token)를 발급합니다.
4.  클라이언트는 발급받은 JWT를 브라우저의 `localStorage`에 저장합니다.

### 8.2. 세션 유지 ("로그인 기억")
- 페이지가 로드될 때, `static/js/auth.js` 스크립트는 `localStorage`에 저장된 JWT가 있는지 확인합니다.
- 토큰이 존재하면, 이후 모든 API 요청의 `Authorization` 헤더에 `Bearer <token>` 형태로 토큰을 포함하여 전송합니다.
- 이를 통해 사용자는 매번 로그인할 필요 없이 자신의 세션을 유지할 수 있습니다.

### 8.3. 로그아웃
- 사용자가 로그아웃 버튼을 클릭하면, `localStorage`에서 JWT를 삭제하고 로그인 페이지로 리디렉션합니다.

### 8.4. 보호된 라우트 접근
- FastAPI의 의존성 주입 시스템을 사용하여 각 API 요청의 헤더에서 JWT를 검증합니다.
- 유효한 토큰이 없거나 만료된 경우, 401 Unauthorized 오류를 반환합니다. 프론트엔드는 이 응답을 받아 사용자를 로그인 페이지로 안내합니다.

---

## 9. 구현 로드맵

### Phase 1: 프로젝트 설정 및 데이터베이스 모델링
1.  `uv` 가상 환경 설정 및 FastAPI, SQLAlchemy, Uvicorn, `python-jose`, `passlib` 등 설치.
2.  제안된 디렉토리 구조 생성.
3.  `app/db/database.py`에 데이터베이스 연결 설정.
4.  `app/db/models.py`에 모든 SQLAlchemy 모델 정의 및 데이터베이스 테이블 생성.

### Phase 2: 인증 시스템 구현
1.  `app/core/security.py`에 비밀번호 해싱 및 JWT 생성/검증 함수 작성.
2.  `app/routers/auth.py`에 `/token` 및 `/users/me` 엔드포인트 구현.
3.  FastAPI 의존성 주입을 사용하여 "현재 로그인된 사용자"를 가져오는 `get_current_user` 함수 구현.

### Phase 3: 핵심 백엔드 로직 및 API 개발
1.  Pydantic 스키마(`app/schemas/`) 정의.
2.  `app/services/reservation_service.py`에 핵심 예약 검증 및 처리 로직 구현.
3.  학생 및 관리자용 API 라우터가 인증된 사용자만 접근할 수 있도록 보호 설정.

### Phase 4: 프론트엔드 구현 (인증 포함)
1.  Jinja2 템플릿 설정 및 `layout.html`, `auth/login.html` 작성.
2.  `static/js/auth.js`를 작성하여 `localStorage`에 JWT를 저장/조회/삭제하는 로직 구현.
3.  로그인 페이지에서 `/auth/token` API와 연동.
4.  학생 및 관리자 페이지 구현 시, `auth.js`를 활용하여 인증 상태를 확인하고 보호된 API를 호출.

### Phase 5: 테스트 및 배포
1.  `pytest`를 사용하여 인증, API 엔드포인트, 서비스 로직에 대한 단위/통합 테스트 작성.
2.  Uvicorn 또는 Gunicorn을 사용하여 애플리케이션 배포 준비.
