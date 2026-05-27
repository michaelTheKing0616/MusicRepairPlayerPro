# Quick ML Models Installation

## 🚀 Fastest Way: Use the Script

### PowerShell (Recommended):
```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml
.\install_all_models.ps1
```

### Batch File:
```cmd
cd C:\Users\HP\Desktop\MusicRepairApp\ml
install_all_models.bat
```

## 📋 Manual Installation (Step-by-Step)

### Step 1: Check Prerequisites

```powershell
# Check Python (you have 3.12.4 ✓)
python --version

# Check Rust (may need to install)
rustc --version
```

### Step 2: Install Rust (If Needed)

**Option A: Using winget** (Easiest)
```powershell
winget install Rustlang.Rustup
# Restart terminal after installation
```

**Option B: Manual Download**
1. Visit: https://rustup.rs/
2. Download `rustup-init.exe`
3. Run it and follow prompts
4. **Restart your terminal**

### Step 3: Install All Models

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml

# Upgrade pip
python -m pip install --upgrade pip

# Install everything at once
python -m pip install -r requirements.txt

# If DeepFilterNet fails, install it separately after Rust
python -m pip install deepfilternet>=0.5.6
```

## ⚡ One-Line Installation (If Rust Already Installed)

```powershell
cd ml && python -m pip install --upgrade pip && python -m pip install -r requirements.txt
```

## ✅ Verify Installation

```powershell
python -c "import torch, librosa, demucs, deepfilternet, pyloudnorm; print('✓ All models installed!')"
```

## 🔧 Troubleshooting

### Rust Not Detected
- **Solution**: Restart terminal after Rust installation
- **Check PATH**: `C:\Users\HP\.cargo\bin` should be in PATH

### DeepFilterNet Installation Fails
- **Check Rust**: `rustc --version` must work
- **Restart Terminal**: After Rust installation
- **Try Again**: `pip install deepfilternet>=0.5.6`

### Installation Takes Too Long
- **Normal**: PyTorch + models = ~20-40 minutes
- **Be Patient**: Downloads are large (GBs)
- **Check Internet**: Stable connection needed

## 📦 What Gets Installed

1. **PyTorch** (2.5.0+) - Core ML framework
2. **librosa** - Audio processing
3. **Demucs** - Source separation
4. **DeepFilterNet** - Denoising (requires Rust)
5. **pyloudnorm** - Loudness normalization
6. Plus all dependencies

## 🎯 After Installation

Test the pipeline:
```bash
python enhanced_pipeline.py input.wav output.wav
```

## Summary

**Quickest**: Run `install_all_models.ps1` or `install_all_models.bat`
**Manual**: Follow step-by-step guide above
**Verify**: Run verification command

Ready to install! 🚀

