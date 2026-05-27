@echo off
REM Development startup script for Windows

echo ========================================
echo MusicRepairApp Backend - Development Mode
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo ERROR: Virtual environment not found
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "venv\Lib\site-packages\fastapi" (
    echo Installing dependencies
    echo.
    echo Installing requirements - ML models are optional
    call venv\Scripts\python.exe -m pip install --upgrade pip
    call venv\Scripts\python.exe -m pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install some dependencies
        echo Please check the error messages above and fix requirements.txt
        echo.
        pause
        exit /b 1
    )
    echo.
    echo NOTE: ML models are optional and commented out in requirements.txt
    echo If you need AI features, install separately:
    echo   pip install torch torchaudio
    echo   pip install demucs whisperx
) else (
    echo Dependencies already installed. Skipping installation.
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo Created .env from .env.example
    ) else if exist "env.example" (
        copy env.example .env >nul
        echo Created .env from env.example
    )     else (
        echo WARNING: No example file found. Creating basic .env
        echo DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/musicrepair > .env
        echo SECRET_KEY=change-this-to-a-random-secret-key-in-production >> .env
        echo REDIS_URL=redis://localhost:6379/0 >> .env
        echo MINIO_ENDPOINT=localhost:9000 >> .env
        echo MINIO_ACCESS_KEY=minioadmin >> .env
        echo MINIO_SECRET_KEY=minioadmin >> .env
    )
    echo.
    echo IMPORTANT: Please edit .env with your actual configuration!
    echo Press any key to continue...
    pause >nul
)

REM Check if database needs migration
echo.
echo Checking database migrations...
call venv\Scripts\python.exe -m alembic upgrade head
if errorlevel 1 (
    echo WARNING: Database migration failed. Database may not be running.
    echo Continuing anyway...
)

REM Seed database (only if users don't exist)
echo.
echo Seeding test users...
call venv\Scripts\python.exe scripts\seed_db.py
if errorlevel 1 (
    echo WARNING: Database seeding failed. Database may not be running.
    echo Continuing anyway...
)

echo.
echo ========================================
echo Starting API server...
echo ========================================
echo.
echo API will be available at: http://localhost:8000
echo API docs at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.
echo Test credentials:
echo   Admin: admin@test.com / admin123
echo   User: user@test.com / user123
echo   Premium: premium@test.com / premium123
echo.
echo ========================================
echo.

REM Start the server
call venv\Scripts\python.exe -m uvicorn app.main:app --reload

pause

