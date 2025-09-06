from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})

@router.get("/student/reservations", response_class=HTMLResponse)
def student_reservation_page(request: Request):
    # This page should be protected, we'll add that logic later
    return templates.TemplateResponse("student/reservation.html", {"request": request})

@router.get("/admin/dashboard", response_class=HTMLResponse)
def admin_dashboard_page(request: Request):
    return templates.TemplateResponse("admin/dashboard.html", {"request": request})

@router.get("/admin/settings", response_class=HTMLResponse)
def admin_settings_page(request: Request):
    return templates.TemplateResponse("admin/settings.html", {"request": request})
