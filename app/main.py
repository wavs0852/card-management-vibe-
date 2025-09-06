from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.db.database import engine
from app.db import models
from app.routers import auth, student, admin, pages # import pages router

# Create all database tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(student.router, prefix="/api/student", tags=["student"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(pages.router) # include pages router

@app.get("/")
def read_root():
    # Redirect to login page by default
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/login")
