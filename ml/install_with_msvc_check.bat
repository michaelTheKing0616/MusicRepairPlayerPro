@echo off
REM Enhanced ML Installation Script with MSVC Build Tools Check
REM This version checks for Visual Studio Build Tools before installing DeepFilterNet

echo ========================================
echo ML Models Installation (Enhanced)
echo ========================================
echo.

echo [1/7] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)
python --version
echo.

echo [2/7] Checking Rust...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo Rust not found - required for DeepFilterNet
    echo.
    echo To install Rust:
    echo   1. Visit: https://rustup.rs/
    echo   2. Download rustup-init.exe
    echo   3. Run it and follow prompts
    echo.
    set hasRust=0
) else (
    rustc --version
    set hasRust=1
)
echo.

echo [3/7] Checking MSVC Build Tools...
if "%hasRust%"=="1" (
    echo Checking for Visual Studio Build Tools...
    
    REM Check for VS2022 Build Tools
    if exist "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" (
        echo Found Visual Studio 2022 Build Tools
        set hasMSVC=1
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" (
        echo Found Visual Studio 2022 Build Tools
        set hasMSVC=1
    ) else if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC" (
        echo Found Visual Studio 2019 Build Tools
        set hasMSVC=1
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC" (
        echo Found Visual Studio 2019 Build Tools
        set hasMSVC=1
    ) else (
        echo WARNING: Visual Studio Build Tools not found!
        echo.
        echo DeepFilterNet requires MSVC Build Tools to compile.
        echo.
        echo To install:
        echo   Option 1: winget install Microsoft.VisualStudio.2022.BuildTools
        echo   Option 2: Download from https://visualstudio.microsoft.com/downloads/
        echo.
        echo Select: C++ build tools, Windows SDK, MSVC compiler
        echo.
        set /p continue="Continue anyway? (Y/N): "
        if /i not "%continue%"=="Y" (
            echo.
            echo Installation cancelled. Please install Build Tools first.
            pause
            exit /b 0
        )
        set hasMSVC=0
    )
) else (
    set hasMSVC=0
)
echo.

echo [4/7] Upgrading pip...
python -m pip install --upgrade pip
echo.

echo [5/7] Installing core ML libraries...
echo This may take 5-10 minutes...
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1
if errorlevel 1 (
    echo ERROR: Core libraries installation failed!
    pause
    exit /b 1
)
echo.

echo [6/7] Installing audio processing libraries...
python -m pip install librosa>=0.10.2 soundfile>=0.12.1
if errorlevel 1 (
    echo WARNING: Some audio libraries failed to install
)
echo.

echo [7/7] Installing ML models...
python -m pip install demucs>=4.1.0
if errorlevel 1 (
    echo WARNING: Demucs installation had issues
)

if "%hasRust%"=="1" (
    if "%hasMSVC%"=="1" (
        echo Installing DeepFilterNet (with Rust and MSVC)...
        echo This may take 5-15 minutes...
        python -m pip install deepfilternet>=0.5.6
        if errorlevel 1 (
            echo.
            echo WARNING: DeepFilterNet installation failed!
            echo This may be due to missing dependencies or compilation errors.
            echo Check DEEPFILTERNET_WINDOWS_FIX.md for solutions.
        ) else (
            echo DeepFilterNet installed successfully!
        )
    ) else (
        echo.
        echo Skipping DeepFilterNet - MSVC Build Tools not found
        echo Install Visual Studio Build Tools to enable DeepFilterNet
    )
) else (
    echo Skipping DeepFilterNet - Rust not available
)

python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.

echo Verifying installation...
python -c "import torch; print('✓ PyTorch', torch.__version__)" 2>nul
python -c "import librosa; print('✓ librosa', librosa.__version__)" 2>nul
python -c "import demucs; print('✓ Demucs')" 2>nul

if "%hasRust%"=="1" (
    python -c "import deepfilternet; print('✓ DeepFilterNet')" 2>nul
    if errorlevel 1 (
        echo ✗ DeepFilterNet - NOT installed (see DEEPFILTERNET_WINDOWS_FIX.md)
    )
) else (
    echo ⚠ DeepFilterNet - Skipped (Rust required)
)

python -c "import pyloudnorm; print('✓ pyloudnorm')" 2>nul

echo.
if "%hasMSVC%"=="0" (
    echo ========================================
    echo IMPORTANT: Install MSVC Build Tools
    echo ========================================
    echo.
    echo To enable DeepFilterNet, install:
    echo   winget install Microsoft.VisualStudio.2022.BuildTools
    echo.
    echo Then re-run this script.
    echo.
)

echo Done!
pause

