@echo off
echo Installing ML dependencies with DeepFilterNet...
echo.
echo This requires Rust to be installed first.
echo.
echo If Rust is not installed:
echo 1. Download from: https://rustup.rs/
echo 2. Or run: winget install Rustlang.Rustup
echo 3. Restart terminal after installation
echo.
pause

cd /d %~dp0

echo Checking for Rust...
rustc --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Rust is not installed or not in PATH!
    echo Please install Rust first from https://rustup.rs/
    pause
    exit /b 1
)

echo Rust found! Installing all dependencies...
echo.

pip install -r requirements.txt

echo.
echo ========================================
echo Installation complete!
echo.
echo All ML models including DeepFilterNet are installed.
echo.
pause

