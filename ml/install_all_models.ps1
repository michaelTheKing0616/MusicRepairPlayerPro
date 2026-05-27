# PowerShell script to install all ML models including DeepFilterNet
# This script will install Rust if needed, then install all Python dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ML Models Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Python
Write-Host "[1/6] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found! Please install Python 3.8+ from python.org" -ForegroundColor Red
    exit 1
}

# Step 2: Check Rust
Write-Host ""
Write-Host "[2/6] Checking Rust installation..." -ForegroundColor Yellow
$rustInstalled = $false
try {
    $rustVersion = rustc --version 2>&1
    Write-Host "✓ Rust found: $rustVersion" -ForegroundColor Green
    $rustInstalled = $true
} catch {
    Write-Host "✗ Rust not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Rust is required for DeepFilterNet. Installing Rust..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if winget is available
    try {
        winget --version | Out-Null
        Write-Host "Installing Rust via winget..." -ForegroundColor Cyan
        winget install Rustlang.Rustup --silent --accept-source-agreements --accept-package-agreements
        Write-Host "✓ Rust installation initiated via winget" -ForegroundColor Green
        Write-Host ""
        Write-Host "IMPORTANT: Please restart your terminal/PowerShell after Rust installation!" -ForegroundColor Yellow
        Write-Host "Then run this script again." -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Press Enter to continue (you'll need to restart terminal first)"
        exit 0
    } catch {
        Write-Host "winget not available. Please install Rust manually:" -ForegroundColor Yellow
        Write-Host "1. Visit: https://rustup.rs/" -ForegroundColor Cyan
        Write-Host "2. Download and run rustup-init.exe" -ForegroundColor Cyan
        Write-Host "3. Restart terminal and run this script again" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "Press Enter to exit (install Rust manually first)"
        exit 1
    }
}

# Step 3: Upgrade pip
Write-Host ""
Write-Host "[3/6] Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip
Write-Host "✓ pip upgraded" -ForegroundColor Green

# Step 4: Install core dependencies first
Write-Host ""
Write-Host "[4/6] Installing core ML dependencies..." -ForegroundColor Yellow
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1
Write-Host "✓ Core dependencies installed" -ForegroundColor Green

# Step 5: Install audio processing libraries
Write-Host ""
Write-Host "[5/6] Installing audio processing libraries..." -ForegroundColor Yellow
python -m pip install librosa>=0.10.2 soundfile>=0.12.1
Write-Host "✓ Audio processing libraries installed" -ForegroundColor Green

# Step 6: Install ML models
Write-Host ""
Write-Host "[6/6] Installing ML models (this may take several minutes)..." -ForegroundColor Yellow

# Install Demucs (doesn't require Rust)
Write-Host "  Installing Demucs..." -ForegroundColor Cyan
python -m pip install demucs>=4.1.0

# Install DeepFilterNet (requires Rust)
if ($rustInstalled) {
    Write-Host "  Installing DeepFilterNet (with Rust support)..." -ForegroundColor Cyan
    python -m pip install deepfilternet>=0.5.6
} else {
    Write-Host "  ⚠ Skipping DeepFilterNet (Rust not available)" -ForegroundColor Yellow
}

# Install other dependencies
Write-Host "  Installing other dependencies..." -ForegroundColor Cyan
python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify installation
Write-Host "Verifying installation..." -ForegroundColor Yellow
try {
    python -c "import torch; print(f'✓ PyTorch {torch.__version__}')"
    python -c "import librosa; print(f'✓ librosa {librosa.__version__}')"
    python -c "import demucs; print('✓ Demucs installed')"
    if ($rustInstalled) {
        python -c "import deepfilternet; print('✓ DeepFilterNet installed')"
    } else {
        Write-Host "⚠ DeepFilterNet not installed (Rust required)" -ForegroundColor Yellow
    }
    python -c "import pyloudnorm; print('✓ pyloudnorm installed')"
    Write-Host ""
    Write-Host "✓ All models installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠ Some packages may not be installed correctly" -ForegroundColor Yellow
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "You can now test the pipeline:" -ForegroundColor Cyan
Write-Host "  python enhanced_pipeline.py input.wav output.wav" -ForegroundColor White
Write-Host ""

