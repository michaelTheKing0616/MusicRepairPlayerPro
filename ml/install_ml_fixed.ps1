# Fixed ML Installation Script - Handles execution policy and errors properly
# Run with: powershell -ExecutionPolicy Bypass -File install_ml_fixed.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ML Models Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/7] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = & python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $pythonVersion" -ForegroundColor Green
    } else {
        throw "Python not found"
    }
} catch {
    Write-Host "✗ Python not found!" -ForegroundColor Red
    Write-Host "Install from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""

# Check Rust
Write-Host "[2/7] Checking Rust..." -ForegroundColor Yellow
$hasRust = $false
try {
    $rustVersion = & rustc --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Rust installed: $rustVersion" -ForegroundColor Green
        $hasRust = $true
    } else {
        throw "Rust not found"
    }
} catch {
    Write-Host "⚠ Rust not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "DeepFilterNet requires Rust for full functionality." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  1. Install Rust now" -ForegroundColor White
    Write-Host "  2. Continue without Rust (fallback will be used)" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Choose option (1 or 2)"
    
    if ($choice -eq "1") {
        Write-Host ""
        Write-Host "Installing Rust via winget..." -ForegroundColor Cyan
        
        try {
            & winget install Rustlang.Rustup --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
            Write-Host "✓ Rust installation initiated" -ForegroundColor Green
            Write-Host ""
            Write-Host "⚠ IMPORTANT: Please restart your terminal after Rust installation!" -ForegroundColor Yellow
            Write-Host "Then run this script again." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Press any key to exit..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 0
        } catch {
            Write-Host ""
            Write-Host "winget not available. Manual installation:" -ForegroundColor Yellow
            Write-Host "  1. Visit: https://rustup.rs/" -ForegroundColor Cyan
            Write-Host "  2. Download rustup-init.exe" -ForegroundColor Cyan
            Write-Host "  3. Run it and follow prompts" -ForegroundColor Cyan
            Write-Host "  4. Restart terminal" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Press any key to exit..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 1
        }
    } else {
        Write-Host "Continuing without Rust. Fallback will be used." -ForegroundColor Yellow
    }
}

Write-Host ""

# Upgrade pip
Write-Host "[3/7] Upgrading pip..." -ForegroundColor Yellow
& python -m pip install --upgrade pip 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ pip upgraded" -ForegroundColor Green
} else {
    Write-Host "⚠ pip upgrade had issues" -ForegroundColor Yellow
}

Write-Host ""

# Install core dependencies
Write-Host "[4/7] Installing core ML libraries (PyTorch, NumPy, SciPy)..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray
& python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Core libraries installed" -ForegroundColor Green
} else {
    Write-Host "✗ Core libraries installation failed" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""

# Install audio processing
Write-Host "[5/7] Installing audio processing libraries..." -ForegroundColor Yellow
& python -m pip install librosa>=0.10.2 soundfile>=0.12.1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Audio libraries installed" -ForegroundColor Green
}

Write-Host ""

# Install ML models
Write-Host "[6/7] Installing ML models..." -ForegroundColor Yellow

Write-Host "  Installing Demucs..." -ForegroundColor Cyan
& python -m pip install demucs>=4.1.0
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✓ Demucs installed" -ForegroundColor Green
}

if ($hasRust) {
    Write-Host "  Installing DeepFilterNet (with Rust)..." -ForegroundColor Cyan
    Write-Host "    This may take 5-15 minutes..." -ForegroundColor Gray
    & python -m pip install deepfilternet>=0.5.6
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ DeepFilterNet installed" -ForegroundColor Green
    } else {
        Write-Host "    ⚠ DeepFilterNet installation failed (will use fallback)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ Skipping DeepFilterNet (Rust not available)" -ForegroundColor Yellow
    Write-Host "    Fallback implementation will be used" -ForegroundColor Gray
}

Write-Host ""

# Install utilities
Write-Host "[7/7] Installing utilities..." -ForegroundColor Yellow
& python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Utilities installed" -ForegroundColor Green
}

Write-Host ""

# Verification
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

$packages = @(
    @{name="PyTorch"; cmd="import torch; print(f'✓ PyTorch {torch.__version__}')"},
    @{name="librosa"; cmd="import librosa; print(f'✓ librosa {librosa.__version__}')"},
    @{name="Demucs"; cmd="import demucs; print('✓ Demucs')"},
    @{name="pyloudnorm"; cmd="import pyloudnorm; print('✓ pyloudnorm')"}
)

foreach ($pkg in $packages) {
    try {
        $output = & python -c $pkg.cmd 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host $output -ForegroundColor Green
        } else {
            Write-Host "✗ $($pkg.name) NOT installed" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "✗ $($pkg.name) NOT installed" -ForegroundColor Red
        $allOk = $false
    }
}

if ($hasRust) {
    try {
        $output = & python -c "import deepfilternet; print('✓ DeepFilterNet')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host $output -ForegroundColor Green
        } else {
            Write-Host "⚠ DeepFilterNet not installed (fallback available)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠ DeepFilterNet not installed (fallback available)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ DeepFilterNet skipped (Rust required)" -ForegroundColor Yellow
}

Write-Host ""

if ($allOk) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test the pipeline:" -ForegroundColor Cyan
    Write-Host "  python enhanced_pipeline.py input.wav output.wav" -ForegroundColor White
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "⚠ Installation completed with warnings" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

