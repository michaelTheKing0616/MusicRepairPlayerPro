@echo off
REM Run React Native App Script (Windows Batch)
REM Usage: run-app.bat [android|ios] [-reset-cache] [-no-bundler]

setlocal enabledelayedexpansion

set PLATFORM=android
set RESET_CACHE=
set NO_BUNDLER=

REM Parse arguments
:parse_args
if "%~1"=="" goto :start_app
if /i "%~1"=="ios" set PLATFORM=ios
if /i "%~1"=="android" set PLATFORM=android
if /i "%~1"=="-reset-cache" set RESET_CACHE=-ResetCache
if /i "%~1"=="-no-bundler" set NO_BUNDLER=-NoBundler
shift
goto :parse_args

:start_app
echo.
echo ========================================
echo   Music Repair App - Runner
echo ========================================
echo.

REM Check if in mobile directory
if not exist "package.json" (
    echo Error: Must run from mobile directory!
    echo Current directory: %CD%
    echo Please run: cd mobile
    pause
    exit /b 1
)

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File ".\run-app.ps1" -Platform %PLATFORM% %RESET_CACHE% %NO_BUNDLER%

if errorlevel 1 (
    echo.
    echo Failed to run app!
    pause
    exit /b 1
)

pause

