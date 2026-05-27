@echo off
echo ========================================
echo ML Models Installation Script
echo ========================================
echo.

echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+ from python.org
    pause
    exit /b 1
)
echo ✓ Python found
echo.

echo [2/6] Checking Rust installation...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo Rust not found - required for DeepFilterNet
    echo.
    echo Installing Rust...
    echo.
    
    REM Try winget first
    where winget >nul 2>&1
    if not errorlevel 1 (
        echo Installing Rust via winget...
        winget install Rustlang.Rustup --silent --accept-source-agreements --accept-package-agreements
        echo.
        echo IMPORTANT: Please restart your terminal after Rust installation!
        echo Then run this script again.
        pause
        exit /b 0
    ) else (
        echo winget not available. Please install Rust manually:
        echo 1. Visit: https://rustup.rs/
        echo 2. Download and run rustup-init.exe
        echo 3. Restart terminal and run this script again
        pause
        exit /b 1
    )
) else (
    echo ✓ Rust found
)
echo.

echo [3/6] Upgrading pip...
python -m pip install --upgrade pip
echo ✓ pip upgraded
echo.

echo [4/6] Installing core ML dependencies...
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1
echo ✓ Core dependencies installed
echo.

echo [5/6] Installing audio processing libraries...
python -m pip install librosa>=0.10.2 soundfile>=0.12.1
echo ✓ Audio processing libraries installed
echo.

echo [6/6] Installing ML models (this may take several minutes)...
echo   Installing Demucs...
python -m pip install demucs>=4.1.0

echo   Installing DeepFilterNet...
python -m pip install deepfilternet>=0.5.6

echo   Installing other dependencies...
python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.

echo Verifying installation...
python -c "import torch; print('✓ PyTorch installed')"
python -c "import librosa; print('✓ librosa installed')"
python -c "import demucs; print('✓ Demucs installed')"
python -c "import deepfilternet; print('✓ DeepFilterNet installed')" 2>nul || echo ⚠ DeepFilterNet not installed (Rust may be needed)
python -c "import pyloudnorm; print('✓ pyloudnorm installed')"

echo.
echo ✓ All models installed successfully!
echo.
echo You can now test the pipeline:
echo   python enhanced_pipeline.py input.wav output.wav
echo.
pause

