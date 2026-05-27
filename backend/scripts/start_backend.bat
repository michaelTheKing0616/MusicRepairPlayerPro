@echo off
REM Complete backend startup script

echo ========================================
echo MusicRepairApp Backend Startup
echo ========================================
echo.

REM Check if venv exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing dependencies...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

REM Check .env
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo Please edit .env with your settings!
    timeout /t 3
)

REM Check if services are running
echo Checking services...
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    echo Checking Docker containers...
    docker-compose ps | findstr "Up" >nul
    if %errorlevel% neq 0 (
        echo Starting Docker services (PostgreSQL, Redis, MinIO)...
        docker-compose up -d db redis minio
        timeout /t 5
    ) else (
        echo Docker services are running.
    )
) else (
    echo Docker not found. Please start PostgreSQL, Redis, and MinIO manually.
)

REM Run migrations
echo Running database migrations...
alembic upgrade head

REM Seed database
echo Seeding test users...
python scripts\seed_db.py

echo.
echo ========================================
echo Backend is ready!
echo ========================================
echo.
echo Starting API server on http://localhost:8000
echo API docs: http://localhost:8000/docs
echo.
echo Test credentials:
echo   admin@test.com / admin123
echo   user@test.com / user123
echo   premium@test.com / premium123
echo.
echo Press Ctrl+C to stop
echo.

uvicorn app.main:app --reload --host 0.0.0.0

