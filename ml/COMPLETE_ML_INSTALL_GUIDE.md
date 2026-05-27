# Complete ML Models Installation Guide

## 🎯 Goal: Install All ML Models Including DeepFilterNet

This guide will help you install all ML models, including DeepFilterNet which requires Rust.

## Quick Installation (Automated)

### Option 1: PowerShell Script (Recommended)
```powershell
cd ml
.\install_all_models.ps1
```

### Option 2: Batch Script
```cmd
cd ml
install_all_models.bat
```

These scripts will:
1. ✅ Check Python installation
2. ✅ Install Rust (if needed)
3. ✅ Install all dependencies
4. ✅ Verify installation

## Manual Installation Steps

### Step 1: Install Rust (Required for DeepFilterNet)

**Windows (Easiest):**
```powershell
# Using winget (if available)
winget install Rustlang.Rustup

# OR download from https://rustup.rs/
# Run rustup-init.exe and follow prompts
```

**After Rust installation:**
- **Restart your terminal/PowerShell**
- Verify: `rustc --version`

### Step 2: Install Python Dependencies

```bash
cd ml

# Upgrade pip first
python -m pip install --upgrade pip

# Install core ML libraries
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1

# Install audio processing
python -m pip install librosa>=0.10.2 soundfile>=0.12.1

# Install ML models
python -m pip install demucs>=4.1.0
python -m pip install deepfilternet>=0.5.6

# Install other dependencies
python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1
```

### Step 3: Verify Installation

```bash
# Check all models are installed
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import librosa; print(f'librosa: {librosa.__version__}')"
python -c "import demucs; print('Demucs: OK')"
python -c "import deepfilternet; print('DeepFilterNet: OK')"
python -c "import pyloudnorm; print('pyloudnorm: OK')"
```

## Installation Order Matters!

Install in this order for best results:

1. **Python** (3.8+)
2. **Rust** (for DeepFilterNet)
3. **PyTorch** (core ML framework)
4. **Audio libraries** (librosa, soundfile)
5. **ML models** (Demucs, DeepFilterNet)
6. **Utilities** (pyloudnorm, etc.)

## Troubleshooting

### Rust Installation Issues

**Problem**: Rust installation fails or not detected
```powershell
# Check if Rust is in PATH
rustc --version

# If not found, restart terminal after installation
# Or manually add to PATH: C:\Users\YourName\.cargo\bin
```

### DeepFilterNet Installation Fails

**Problem**: `deepfilternet` installation fails
```bash
# Make sure Rust is installed and terminal is restarted
rustc --version

# Try installing with verbose output
pip install deepfilternet>=0.5.6 -v

# If still fails, you can use fallback implementation (already in code)
```

### PyTorch Installation Issues

**Problem**: PyTorch installation is slow/fails
```bash
# Install PyTorch with specific index (faster)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
# Or for CUDA:
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Memory/Disk Space

**Problem**: Installation runs out of space
- PyTorch + models require ~2-3GB disk space
- Ensure you have enough free space
- Consider installing models to a different drive if needed

## Alternative: Install Without Rust (Fallback Only)

If you can't install Rust, you can still use the pipeline with fallback implementations:

```bash
cd ml

# Install everything except DeepFilterNet
pip install torch torchaudio numpy scipy librosa soundfile demucs pyloudnorm supabase tqdm python-dotenv
```

The code has fallback noise reduction that works without DeepFilterNet (lower quality but functional).

## Verify Everything Works

### Test Installation:
```bash
cd ml
python -c "
import torch
import torchaudio
import librosa
import demucs
import pyloudnorm
print('✓ All core dependencies installed')

try:
    import deepfilternet
    print('✓ DeepFilterNet installed')
except ImportError:
    print('⚠ DeepFilterNet not installed (will use fallback)')
"
```

### Test Pipeline:
```bash
python enhanced_pipeline.py test_audio.wav output.wav
```

## Expected Installation Time

- Rust: 2-5 minutes (one-time)
- PyTorch: 5-10 minutes
- Demucs: 3-5 minutes
- DeepFilterNet: 5-15 minutes (compiles with Rust)
- Other packages: 2-3 minutes

**Total: ~20-40 minutes** (depending on internet speed)

## System Requirements

- **Python**: 3.8 or higher
- **Rust**: Latest stable (for DeepFilterNet)
- **Disk Space**: ~3-4GB for all models
- **RAM**: 4GB+ recommended
- **OS**: Windows/Linux/Mac

## Summary

✅ **Automated scripts available** (recommended)
✅ **Manual steps documented**
✅ **Fallback option if Rust unavailable**
✅ **Verification steps included**

## Quick Start

```powershell
# Navigate to ML directory
cd C:\Users\HP\Desktop\MusicRepairApp\ml

# Run automated installation
.\install_all_models.ps1

# Or use batch file
install_all_models.bat
```

The scripts will handle everything automatically! 🚀

