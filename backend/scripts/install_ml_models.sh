#!/bin/bash
# Script to install ML models for the backend

set -e

echo "========================================="
echo "Installing ML Models for MusicRepairApp"
echo "========================================="
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install PyTorch (CPU version for now - change to CUDA if GPU available)
echo ""
echo "Installing PyTorch and torchaudio..."
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Demucs for stem separation
echo ""
echo "Installing Demucs for stem separation..."
pip install demucs

# Install WhisperX for transcription
echo ""
echo "Installing WhisperX for transcription..."
pip install whisperx

# Install additional audio processing dependencies
echo ""
echo "Installing additional audio processing dependencies..."
pip install crepe==0.0.13
pip install pyworld==0.3.2

# Verify installations
echo ""
echo "========================================="
echo "Verifying installations..."
echo "========================================="
python -c "import torch; print(f'PyTorch version: {torch.__version__}')"
python -c "import torchaudio; print(f'torchaudio version: {torchaudio.__version__}')"
python -c "import demucs; print('Demucs: OK')" || echo "Demucs: Not installed"
python -c "import whisperx; print('WhisperX: OK')" || echo "WhisperX: Not installed"

echo ""
echo "========================================="
echo "ML Models installation complete!"
echo "========================================="
echo ""
echo "Note: Models will be downloaded on first use."
echo "This may take several minutes depending on your internet connection."

