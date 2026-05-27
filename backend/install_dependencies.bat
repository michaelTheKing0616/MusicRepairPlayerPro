@echo off
echo Installing backend dependencies...
echo.

cd /d %~dp0

echo Checking Node.js version...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Installing npm packages...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm install failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation complete!
echo.
echo Next steps:
echo 1. Copy env.example to .env and configure
echo 2. Run: npm run prisma:generate
echo 3. Run: npm run prisma:migrate
echo 4. Run: npm run dev
echo.
pause

