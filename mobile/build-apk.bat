@echo off
REM Build Android APK Script (Windows Batch)
REM Usage: build-apk.bat [debug|release] [-clean] [-install]

setlocal enabledelayedexpansion

set BUILD_TYPE=debug
set CLEAN_FLAG=
set INSTALL_FLAG=

REM Parse arguments
:parse_args
if "%~1"=="" goto :start_build
if /i "%~1"=="release" set BUILD_TYPE=release
if /i "%~1"=="debug" set BUILD_TYPE=debug
if /i "%~1"=="-clean" set CLEAN_FLAG=-Clean
if /i "%~1"=="-install" set INSTALL_FLAG=-Install
shift
goto :parse_args

:start_build
echo.
echo ========================================
echo   Music Repair App - APK Builder
echo ========================================
echo Build Type: %BUILD_TYPE%
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
powershell -ExecutionPolicy Bypass -File ".\build-apk.ps1" -BuildType %BUILD_TYPE% %CLEAN_FLAG% %INSTALL_FLAG%

if errorlevel 1 (
    echo.
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build complete!
pause

