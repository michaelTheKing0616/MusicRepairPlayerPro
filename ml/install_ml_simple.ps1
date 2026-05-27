# Simple ML Installation Script - No Execution Policy Issues
# This version avoids execution policy problems

Write-Host "ML Models Installation" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

# Check Rust
Write-Host "Checking Rust..." -ForegroundColor Yellow
$hasRust = $false
try {
    $rustVersion = rustc --version 2>&1
    Write-Host "Rust found: $rustVersion" -ForegroundColor Green
    $hasRust = $true
} catch {
    Write-Host "Rust not found - required for DeepFilterNet" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install Rust:" -ForegroundColor Cyan
    Write-Host "  1. Visit: https://rustup.rs/" -ForegroundColor White
    Write-Host "  2. Download rustup-init.exe" -ForegroundColor White
    Write-Host "  3. Run it and follow prompts" -ForegroundColor White
    Write-Host "  4. Restart terminal" -ForegroundColor White
    Write-Host ""
    Write-Host "Or install via winget:" -ForegroundColor Cyan
    Write-Host "  winget install Rustlang.Rustup" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue without Rust? (Y/N)"
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 0
    }
}
Write-Host ""

# Install packages
Write-Host "Installing ML dependencies..." -ForegroundColor Yellow
Write-Host "This may take 20-40 minutes..." -ForegroundColor Gray
Write-Host ""

python -m pip install --upgrade pip

Write-Host "Installing core libraries..." -ForegroundColor Cyan
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1

Write-Host "Installing audio libraries..." -ForegroundColor Cyan
python -m pip install librosa>=0.10.2 soundfile>=0.12.1

Write-Host "Installing Demucs..." -ForegroundColor Cyan
python -m pip install demucs>=4.1.0

if ($hasRust) {
    Write-Host "Installing DeepFilterNet..." -ForegroundColor Cyan
    python -m pip install deepfilternet>=0.5.6
} else {
    Write-Host "Skipping DeepFilterNet (Rust not available)" -ForegroundColor Yellow
}

Write-Host "Installing utilities..." -ForegroundColor Cyan
python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying..." -ForegroundColor Yellow
python -c "import torch; print('✓ PyTorch')"
python -c "import librosa; print('✓ librosa')"
python -c "import demucs; print('✓ Demucs')"
if ($hasRust) {
    python -c "import deepfilternet; print('✓ DeepFilterNet')" 2>$null
}
python -c "import pyloudnorm; print('✓ pyloudnorm')"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
pause

