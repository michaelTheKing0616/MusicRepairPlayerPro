@echo off
echo Installing ML dependencies (without DeepFilterNet to avoid Rust requirement)...
echo.
echo This will install all dependencies except DeepFilterNet.
echo The pipeline will use fallback noise reduction (works for testing).
echo.
pause

cd /d %~dp0

pip install torch>=2.0.0
pip install torchaudio>=2.0.0
pip install numpy>=1.24.0
pip install scipy>=1.10.0
pip install librosa>=0.10.0
pip install soundfile>=0.12.0
pip install demucs>=4.0.0
pip install pyloudnorm>=0.1.1
pip install supabase>=2.0.0
pip install tqdm>=4.65.0
pip install python-dotenv>=1.0.0

echo.
echo ========================================
echo Installation complete!
echo.
echo Note: DeepFilterNet was skipped (requires Rust).
echo The pipeline will use fallback noise reduction.
echo.
echo To install DeepFilterNet later:
echo 1. Install Rust from https://rustup.rs/
echo 2. Run: pip install deepfilternet
echo.
pause

