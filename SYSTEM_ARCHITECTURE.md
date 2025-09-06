# 공유 카드 관리 시스템 아키텍처 설계

## 1. 개요

본 문서는 '공유 카드 관리 시스템'의 기술적 아키텍처를 정의합니다. 시스템은 확장성, 유지보수성, 그리고 사용자 중심의 설계를 목표로 하는 계층형 아키텍처(Layered Architecture)를 따릅니다.

---

## 2. 아키텍처 목표 및 원칙

- **관심사 분리 (Separation of Concerns)**: 각 계층은 명확히 정의된 역할만 수행하여 결합도를 낮춥니다. (e.g., API 라우터는 비즈니스 로직을 직접 포함하지 않음)
- **단일 책임 원칙 (Single Responsibility Principle)**: 각 컴포넌트는 하나의 주요 기능에만 집중합니다.
- **확장성**: 향후 기능 추가 및 변경이 용이하도록 모듈식으로 설계합니다.
- **데이터 무결성**: ORM과 스키마 유효성 검사를 통해 데이터의 일관성과 정확성을 보장합니다.

---

## 3. 고수준 아키텍처 (3-Tier Layered Architecture)

시스템은 크게 **프레젠테이션 계층**, **애플리케이션 계층**, **데이터 계층**의 3가지 논리적 계층으로 구성됩니다.

```
+--------------------------------------------------------------------+
|                     Presentation Layer (Frontend)                    |
|  [Web Browser: HTML/CSS/JS] <=> [Jinja2 Templates]                   |
+--------------------------------------------------------------------+
              | (HTTP Requests: API Calls via JavaScript)
              v
+--------------------------------------------------------------------+
|                   Application Layer (Backend)                      |
| +----------------------------------------------------------------+ |
| | [FastAPI Web Server - Uvicorn]                                 | |
| +----------------------------------------------------------------+ |
| | [API Routers (Auth, Student, Admin)]                           | |
| |   -> (Depends on) [Security: JWT, Dependencies: User Auth]     | |
| +----------------------------------------------------------------+ |
| | [Service Layer (Core Business Logic)]                          | |
| |   e.g., ReservationService, UserService                        | |
| +----------------------------------------------------------------+ |
| | [Data Access Layer (SQLAlchemy ORM)]                           | |
| |   -> (Uses) [DB Models, DB Session]                            | |
| +----------------------------------------------------------------+ |
+--------------------------------------------------------------------+
              | (SQL Queries via SQLAlchemy)
              v
+--------------------------------------------------------------------+
|                        Data Layer (Database)                       |
|  [SQLite Database]                                                 |
+--------------------------------------------------------------------+
```

---

## 4. 핵심 컴포넌트 상세

### 4.1. 프레젠테이션 계층 (Presentation Layer)
- **역할**: 사용자 인터페이스(UI)를 제공하고 사용자 상호작용을 처리합니다.
- **구성 요소**:
  - **웹 브라우저**: 최종적으로 렌더링된 HTML, CSS, JavaScript를 실행합니다.
  - **Jinja2 템플릿**: 서버에서 동적으로 HTML을 생성합니다. 사용자의 인증 상태나 데이터에 따라 다른 화면을 보여줍니다.
  - **JavaScript (`static/js/`)**: API 호출, DOM 조작, JWT 토큰 관리 등 클라이언트 사이드의 동적인 로직을 담당합니다.

### 4.2. 애플리케이션 계층 (Application Layer)
- **역할**: 시스템의 핵심 비즈니스 로직을 처리하고, 데이터 요청을 관리하며, 보안을 책임집니다.
- **구성 요소**:
  - **API 라우터 (`routers/`)**: HTTP 요청의 엔드포인트입니다. 요청을 수신하여 유효성을 검사하고, 적절한 서비스로 전달하는 역할만 수행합니다.
  - **서비스 계층 (`services/`)**: 예약 생성, 검증, 충돌 해결 등 순수한 비즈니스 로직을 포함합니다. 이 계층은 웹 프레임워크나 데이터베이스에 직접적으로 의존하지 않아 테스트와 재사용이 용이합니다.
  - **데이터 접근 계층 (DAL)**: SQLAlchemy ORM을 사용하여 데이터베이스와의 상호작용을 추상화합니다. 서비스 계층의 요청에 따라 DB 세션을 통해 데이터를 CRUD(생성, 조회, 수정, 삭제)합니다.
  - **보안 컴포넌트 (`core/security.py`)**: JWT 생성 및 검증, 비밀번호 암호화 등 인증/인가와 관련된 모든 기능을 담당합니다.

### 4.3. 데이터 계층 (Data Layer)
- **역할**: 모든 데이터를 영구적으로 저장하고 관리합니다.
- **구성 요소**:
  - **SQLite**: 개발 및 소규모 운영 환경에 적합한 파일 기반 데이터베이스입니다.
  - **SQLAlchemy 모델 (`db/models.py`)**: 데이터베이스 테이블 구조를 파이썬 클래스로 정의합니다.

---

## 5. 주요 데이터 흐름 예시: 학생 예약 생성

1.  **[Frontend]** 사용자가 브라우저에서 날짜와 시간을 선택하고, 소속 팀을 고른 후 '예약' 버튼을 클릭합니다.
2.  **[Frontend]** `auth.js`가 `localStorage`에서 JWT를 가져와 `Authorization` 헤더에 담아 `/student/reservations` 엔드포인트로 `POST` 요청을 보냅니다.
3.  **[Backend]** `student.py` 라우터가 요청을 수신합니다. FastAPI의 의존성 주입 시스템이 JWT를 검증하여 현재 사용자를 식별합니다.
4.  **[Backend]** 라우터는 `ReservationService.create_reservation()` 함수를 호출하며, 요청 데이터와 현재 사용자 정보를 전달합니다.
5.  **[Backend]** `ReservationService`는 예약 검증 로직(시간, 팀, 인원 충돌 등)을 순차적으로 실행합니다.
6.  **[Backend]** 모든 검증을 통과하면, 서비스는 데이터 접근 계층(SQLAlchemy)을 통해 `Reservation` 객체를 생성하고 데이터베이스 세션에 추가합니다.
7.  **[Backend]** 데이터베이스에 성공적으로 커밋되면, 서비스는 성공 결과를 라우터에 반환합니다.
8.  **[Backend]** 라우터는 HTTP `201 Created` 응답을 생성하여 프론트엔드에 전송합니다.
9.  **[Frontend]** 브라우저는 성공 응답을 받고, 사용자에게 '예약이 완료되었습니다'와 같은 확인 메시지를 보여줍니다.

---

## 6. 검토 및 다음 단계

여기까지가 시스템의 핵심 뼈대에 해당하는 고수준 아키텍처 설계입니다. 제안된 구조가 요구사항을 충족하고 논리적으로 타당한지 검토를 부탁드립니다.

오류가 없다고 판단되면, 다음 단계로 각 컴포넌트의 세부적인 인터페이스 정의, 데이터 모델링 상세화, 그리고 예외 처리 전략 등 구체적인 설계로 넘어가겠습니다.

---

# 상세 설계 명세

## 7. 상세 데이터 모델링 (Pydantic Schemas)

API의 요청/응답 데이터 형식을 정의하고 유효성을 검사하기 위해 Pydantic 모델을 사용합니다. (`app/schemas/`)

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool
    teams: List['Team'] = []

    class Config:
        orm_mode = True

# --- Team Schemas ---
class TeamBase(BaseModel):
    name: str

class Team(TeamBase):
    id: int
    course_id: int

    class Config:
        orm_mode = True

# --- Reservation Schemas ---
class ReservationBase(BaseModel):
    reservation_date: date
    time_slot: str # e.g., "LUNCH"

class ReservationCreate(ReservationBase):
    team_id: int

class Reservation(ReservationBase):
    id: int
    team: Team

    class Config:
        orm_mode = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
```

---

## 8. 상세 API 엔드포인트 명세

### 8.1. 인증 API (`/auth`)

- **`POST /token`**
  - **설명**: 사용자 로그인 후 JWT 액세스 토큰을 발급합니다.
  - **요청**: `OAuth2PasswordRequestForm` (username, password)
  - **응답 (200 OK)**: `schemas.Token`
  - **오류 (401 Unauthorized)**: 인증 실패

- **`GET /users/me`**
  - **설명**: 현재 로그인된 사용자의 상세 정보(소속 팀 포함)를 반환합니다.
  - **권한**: 학생, 관리자
  - **응답 (200 OK)**: `schemas.User`
  - **오류 (401 Unauthorized)**: 토큰이 없거나 유효하지 않음

### 8.2. 학생 API (`/student`)

- **`POST /reservations`**
  - **설명**: 새로운 예약을 생성합니다.
  - **권한**: 학생
  - **요청**: `schemas.ReservationCreate`
  - **응답 (201 Created)**: `schemas.Reservation`
  - **오류**:
    - `401 Unauthorized`: 인증 실패
    - `409 Conflict`: 예약 충돌 (시간, 팀, 인원 등)
    - `422 Unprocessable Entity`: 요청 데이터 유효성 오류

### 8.3. 관리자 API (`/admin`)

- **`PUT /settings`**
  - **설명**: 시스템 설정을 수정합니다. (e.g., 동시 사용 팀 수)
  - **권한**: 관리자
  - **요청**: `{"key": "max_concurrent_teams", "value": "5"}`
  - **응답 (200 OK)**: `{"message": "Settings updated"}`
  - **오류 (401 Unauthorized)**: 인증 실패 / 권한 없음

---

## 9. 서비스 계층 인터페이스 (`app/services/`)

- **`ReservationService`**
  - `create_reservation(db: Session, user: models.User, reservation_data: schemas.ReservationCreate) -> models.Reservation`: 예약 생성 및 모든 비즈니스 규칙 검증.
  - `get_reservations_by_user(db: Session, user: models.User) -> List[models.Reservation]`: 특정 사용자의 모든 예약 조회.
  - `cancel_reservation(db: Session, user: models.User, reservation_id: int) -> models.Reservation`: 예약 취소. (본인 또는 관리자만 가능)

- **`UserService`**
  - `authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]`: 사용자 이름과 비밀번호로 인증.
  - `get_user(db: Session, username: str) -> Optional[models.User]`: 사용자 정보 조회.

---

## 10. 예외 처리 전략

- **중앙 집중식 예외 처리**: FastAPI의 `@app.exception_handler()` 데코레이터를 사용하여 커스텀 예외를 전역적으로 처리합니다.
- **커스텀 예외 정의**: 비즈니스 로직에서 발생할 수 있는 특정 상황에 대한 예외를 정의합니다.
  - `ReservationConflictError`: 예약 충돌 시 발생. `HTTP 409 Conflict`로 변환.
  - `PermissionDeniedError`: 권한 없는 접근 시 발생. `HTTP 403 Forbidden`으로 변환.
  - `NotFoundError`: 리소스를 찾을 수 없을 때 발생. `HTTP 404 Not Found`로 변환.

**예시 (`main.py`)**:
```python
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

class ReservationConflictError(Exception):
    pass

app = FastAPI()

@app.exception_handler(ReservationConflictError)
async def reservation_conflict_handler(request: Request, exc: ReservationConflictError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"message": str(exc)},
    )
```

---

## 11. 프론트엔드 컴포넌트 상세

- **`auth.js` (인증 관리 모듈)**
  - **`login(username, password)`**: `/auth/token`으로 요청을 보내고 받은 JWT를 `localStorage`에 저장.
  - **`logout()`**: `localStorage`에서 JWT 삭제.
  - **`getToken()`**: 저장된 JWT를 반환.
  - **`fetchWithAuth(url, options)`**: `fetch` API를 래핑하여 모든 요청에 자동으로 `Authorization` 헤더를 추가하는 유틸리티 함수.

- **`reservation.js` (예약 페이지 로직)**
  - **`initCalendar()`**: 캘린더 UI를 초기화하고, 각 날짜에 예약 가능 여부를 표시.
  - **`handleDateClick(date)`**: 날짜 클릭 시, 예약 가능한 시간대(아침/점심/저녁)를 보여주는 모달(Modal)을 표시.
  - **`handleTimeSlotClick(timeSlot)`**: 시간대 클릭 시, `/users/me` API로 받은 사용자 정보에서 팀 목록을 가져와 선택지로 보여줌.
  - **`submitReservation(teamId, date, timeSlot)`**: `fetchWithAuth`를 사용하여 `/student/reservations` API 호출 및 결과 처리.

---

## 12. 최종 구현 계획

1.  **Phase 1: 환경 설정 및 모델링**: `uv` 가상환경, 라이브러리 설치, `models.py` 및 `schemas.py` 완성.
2.  **Phase 2: 인증 시스템 구현**: `security.py` 작성, `/auth` 라우터 및 `UserService` 구현.
3.  **Phase 3: 프론트엔드 인증 연동**: `login.html` 및 `auth.js`를 구현하여 실제 로그인/로그아웃 기능 완성.
4.  **Phase 4: 핵심 기능 (예약) 구현**: `ReservationService`의 핵심 검증 로직 구현, `/student/reservations` API 완성.
5.  **Phase 5: 프론트엔드 예약 UI 구현**: `reservation.js`와 캘린더 UI를 연동하여 예약 생성/조회/취소 기능 완성.
6.  **Phase 6: 관리자 기능 구현**: 관리자용 API 및 웹 인터페이스 구현.
7.  **Phase 7: 테스트 및 리팩토링**: `pytest`를 이용한 통합/단위 테스트 작성 및 코드 개선.
