# Install All ML Models - Complete Guide

## 🎯 Your Current Status

- ✅ **Python**: 3.12.4 (installed)
- ❌ **Rust**: Not installed (needed for DeepFilterNet)

## 🚀 Quick Start: Install Everything

### Option 1: Automated Script (Easiest) ⭐

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml
.\install_with_rust_check.ps1
```

This script will:
1. Check for Rust
2. Offer to install Rust if missing
3. Install all ML models
4. Verify installation

### Option 2: Step-by-Step Manual Installation

## Step 1: Install Rust (Required for DeepFilterNet)

### Method A: Using winget (Easiest)

```powershell
winget install Rustlang.Rustup
```

### Method B: Download from Website

1. Visit: **https://rustup.rs/**
2. Download `rustup-init.exe`
3. Run it and follow the prompts
4. Choose default installation

### After Rust Installation:

⚠️ **IMPORTANT**: **Restart your terminal/PowerShell** after Rust installation!

Verify Rust is installed:
```powershell
rustc --version
# Should show: rustc 1.xx.x
```

## Step 2: Install All ML Models

### Once Rust is Installed:

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml

# Upgrade pip first
python -m pip install --upgrade pip

# Install all dependencies from requirements.txt
python -m pip install -r requirements.txt
```

This will install:
- ✅ PyTorch 2.5.0+
- ✅ TorchAudio 2.5.0+
- ✅ NumPy, SciPy
- ✅ librosa, soundfile
- ✅ Demucs (source separation)
- ✅ DeepFilterNet (denoising) - requires Rust
- ✅ pyloudnorm (normalization)
- ✅ All utilities

## Step 3: Verify Installation

```powershell
# Test all models
python -c "import torch; print(f'✓ PyTorch {torch.__version__}')"
python -c "import librosa; print(f'✓ librosa {librosa.__version__}')"
python -c "import demucs; print('✓ Demucs')"
python -c "import deepfilternet; print('✓ DeepFilterNet')"
python -c "import pyloudnorm; print('✓ pyloudnorm')"
```

## ⚡ Complete Installation Command (After Rust Installed)

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml
python -m pip install --upgrade pip
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1 librosa>=0.10.2 soundfile>=0.12.1 demucs>=4.1.0 deepfilternet>=0.5.6 pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1
```

## 📦 What Gets Installed

| Package | Purpose | Requires Rust |
|---------|---------|---------------|
| PyTorch | ML Framework | ❌ No |
| TorchAudio | Audio processing | ❌ No |
| librosa | Audio analysis | ❌ No |
| Demucs | Source separation | ❌ No |
| **DeepFilterNet** | Denoising | ✅ **Yes** |
| pyloudnorm | Normalization | ❌ No |

## ⏱️ Expected Installation Time

- **Rust**: 2-5 minutes (one-time)
- **PyTorch**: 5-10 minutes
- **Demucs**: 3-5 minutes
- **DeepFilterNet**: 5-15 minutes (compiles with Rust)
- **Other packages**: 2-3 minutes

**Total: ~20-40 minutes** (depending on internet speed)

## 🔧 Troubleshooting

### Rust Not Detected After Installation

**Problem**: `rustc --version` fails after installing Rust

**Solution**:
1. **Close and restart** your terminal/PowerShell completely
2. Verify PATH includes: `C:\Users\HP\.cargo\bin`
3. Try again: `rustc --version`

### DeepFilterNet Installation Fails

**Problem**: `pip install deepfilternet` fails

**Check**:
```powershell
# Verify Rust is working
rustc --version
cargo --version

# If both work, try again
python -m pip install deepfilternet>=0.5.6 -v
```

**Fallback**: If Rust installation is problematic, the code has a fallback implementation that works without DeepFilterNet (lower quality but functional).

### Installation is Very Slow

**Normal**: PyTorch + models download several GB of data
- PyTorch: ~500MB
- Models: ~1-2GB
- Be patient, ensure stable internet connection

## ✅ Installation Checklist

- [ ] Python 3.12.4 installed ✅
- [ ] Rust installed (for DeepFilterNet)
- [ ] Terminal restarted after Rust installation
- [ ] All packages installed via `pip install -r requirements.txt`
- [ ] Verified with test commands
- [ ] Tested pipeline: `python enhanced_pipeline.py test.wav output.wav`

## 🎯 Recommended Installation Flow

### 1. Install Rust First
```powershell
winget install Rustlang.Rustup
# Wait for completion, then RESTART TERMINAL
```

### 2. Verify Rust
```powershell
rustc --version  # Should work after restart
```

### 3. Install All Models
```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 4. Verify Everything
```powershell
python -c "import torch, librosa, demucs, deepfilternet, pyloudnorm; print('✓ All installed!')"
```

## Summary

**Fastest Method**:
1. Run `install_with_rust_check.ps1` (handles everything)
2. Or install Rust manually, restart terminal, then run `pip install -r requirements.txt`

**You're ready to install!** 🚀

