@echo off
REM Script to install ML models for the backend (Windows)

echo ========================================
echo Installing ML Models for MusicRepairApp
echo ========================================
echo.

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Upgrade pip
echo.
echo Upgrading pip...
call venv\Scripts\python.exe -m pip install --upgrade pip

REM Install PyTorch (CPU version for now - change to CUDA if GPU available)
echo.
echo Installing PyTorch and torchaudio...
call venv\Scripts\python.exe -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

REM Install Demucs for stem separation
echo.
echo Installing Demucs for stem separation...
call venv\Scripts\python.exe -m pip install demucs

REM Install WhisperX for transcription
echo.
echo Installing WhisperX for transcription...
call venv\Scripts\python.exe -m pip install whisperx

REM Install additional audio processing dependencies
echo.
echo Installing additional audio processing dependencies...
call venv\Scripts\python.exe -m pip install crepe==0.0.13
call venv\Scripts\python.exe -m pip install pyworld==0.3.2

REM Verify installations
echo.
echo ========================================
echo Verifying installations...
echo ========================================
call venv\Scripts\python.exe -c "import torch; print(f'PyTorch version: {torch.__version__}')"
call venv\Scripts\python.exe -c "import torchaudio; print(f'torchaudio version: {torchaudio.__version__}')"
call venv\Scripts\python.exe -c "import demucs; print('Demucs: OK')" || echo Demucs: Not installed
call venv\Scripts\python.exe -c "import whisperx; print('WhisperX: OK')" || echo WhisperX: Not installed

echo.
echo ========================================
echo ML Models installation complete!
echo ========================================
echo.
echo Note: Models will be downloaded on first use.
echo This may take several minutes depending on your internet connection.
echo.
pause

