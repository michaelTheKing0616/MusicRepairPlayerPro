@echo off
REM Setup script for Windows

echo Setting up MusicRepairApp Backend...

REM Check Python
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.10+
    pause
    exit /b 1
)

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Copy environment file
if not exist ".env" (
    echo Copying .env.example to .env...
    copy .env.example .env
    echo Please edit .env with your configuration!
)

echo Setup complete!
echo.
echo Next steps:
echo 1. Edit .env with your database and storage configuration
echo 2. Start PostgreSQL, Redis, and MinIO
echo 3. Run: alembic upgrade head
echo 4. Run: uvicorn app.main:app --reload
echo 5. Run: celery -A app.tasks.celery_app worker --loglevel=info

pause


