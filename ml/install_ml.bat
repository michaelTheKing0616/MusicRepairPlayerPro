@echo off
REM Simple ML Installation Script - No PowerShell execution policy issues
REM Use this if PowerShell scripts don't work

echo ========================================
echo ML Models Installation
echo ========================================
echo.

echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)
python --version
echo.

echo [2/6] Checking Rust...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo Rust not found - required for DeepFilterNet
    echo.
    echo To install Rust:
    echo   1. Visit: https://rustup.rs/
    echo   2. Download rustup-init.exe
    echo   3. Run it and follow prompts
    echo   4. Restart terminal
    echo.
    echo Or: winget install Rustlang.Rustup
    echo.
    set /p continue="Continue without Rust? (Y/N): "
    if /i not "%continue%"=="Y" exit /b 0
    set hasRust=0
) else (
    rustc --version
    set hasRust=1
)
echo.

echo [3/6] Upgrading pip...
python -m pip install --upgrade pip
echo.

echo [4/6] Installing core ML libraries...
echo This may take 5-10 minutes...
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1
echo.

echo [5/6] Installing audio processing libraries...
python -m pip install librosa>=0.10.2 soundfile>=0.12.1
echo.

echo [6/6] Installing ML models...
python -m pip install demucs>=4.1.0
if "%hasRust%"=="1" (
    echo Installing DeepFilterNet...
    python -m pip install deepfilternet>=0.5.6
) else (
    echo Skipping DeepFilterNet (Rust not available)
)
python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.

echo Verifying installation...
python -c "import torch; print('✓ PyTorch')" 2>nul
python -c "import librosa; print('✓ librosa')" 2>nul
python -c "import demucs; print('✓ Demucs')" 2>nul
if "%hasRust%"=="1" (
    python -c "import deepfilternet; print('✓ DeepFilterNet')" 2>nul
)
python -c "import pyloudnorm; print('✓ pyloudnorm')" 2>nul

echo.
echo Done!
pause

