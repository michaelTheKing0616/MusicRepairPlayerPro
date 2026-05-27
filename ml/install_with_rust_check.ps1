# Smart ML Installation Script with Rust Detection
# This script checks for Rust and installs it if needed

param(
    [switch]$SkipRustCheck = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ML Models Installation - Complete Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Python Check
Write-Host "[1/7] Checking Python..." -ForegroundColor Yellow
try {
    $pyVersion = python --version 2>&1
    Write-Host "✓ $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found!" -ForegroundColor Red
    Write-Host "Install from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Step 2: Rust Check
Write-Host ""
Write-Host "[2/7] Checking Rust..." -ForegroundColor Yellow
$rustAvailable = $false

if (-not $SkipRustCheck) {
    try {
        $rustVersion = rustc --version 2>&1
        Write-Host "✓ Rust installed: $rustVersion" -ForegroundColor Green
        $rustAvailable = $true
    } catch {
        Write-Host "⚠ Rust not found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "DeepFilterNet requires Rust for full functionality." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "  1. Install Rust now (recommended)" -ForegroundColor White
        Write-Host "  2. Skip Rust and use fallback (limited functionality)" -ForegroundColor White
        Write-Host ""
        
        $choice = Read-Host "Choose option (1 or 2)"
        
        if ($choice -eq "1") {
            Write-Host ""
            Write-Host "Installing Rust..." -ForegroundColor Cyan
            
            # Try winget
            try {
                $wingetCheck = Get-Command winget -ErrorAction Stop
                Write-Host "Using winget to install Rust..." -ForegroundColor Cyan
                Start-Process -FilePath "winget" -ArgumentList "install", "Rustlang.Rustup", "--silent", "--accept-source-agreements", "--accept-package-agreements" -Wait -NoNewWindow
                Write-Host "✓ Rust installation completed" -ForegroundColor Green
                Write-Host ""
                Write-Host "⚠ IMPORTANT: Please restart your terminal/PowerShell" -ForegroundColor Yellow
                Write-Host "Then run this script again to continue." -ForegroundColor Yellow
                Write-Host ""
                Read-Host "Press Enter to exit (restart terminal first)"
                exit 0
            } catch {
                Write-Host ""
                Write-Host "winget not available. Manual installation required:" -ForegroundColor Yellow
                Write-Host "  1. Visit: https://rustup.rs/" -ForegroundColor Cyan
                Write-Host "  2. Download rustup-init.exe" -ForegroundColor Cyan
                Write-Host "  3. Run it and follow prompts" -ForegroundColor Cyan
                Write-Host "  4. Restart terminal" -ForegroundColor Cyan
                Write-Host "  5. Run this script again" -ForegroundColor Cyan
                Write-Host ""
                Read-Host "Press Enter to exit"
                exit 1
            }
        } else {
            Write-Host "Skipping Rust installation. Fallback will be used." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Skipping Rust check (using -SkipRustCheck)" -ForegroundColor Yellow
}

# Step 3: Upgrade pip
Write-Host ""
Write-Host "[3/7] Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
Write-Host "✓ pip upgraded" -ForegroundColor Green

# Step 4: Install Core Dependencies
Write-Host ""
Write-Host "[4/7] Installing core ML libraries (PyTorch, NumPy, SciPy)..." -ForegroundColor Yellow
Write-Host "  This may take 5-10 minutes..." -ForegroundColor Gray
python -m pip install torch>=2.5.0 torchaudio>=2.5.0 numpy>=1.26.4 scipy>=1.14.1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Core libraries installed" -ForegroundColor Green
} else {
    Write-Host "✗ Core libraries installation failed" -ForegroundColor Red
    exit 1
}

# Step 5: Install Audio Processing
Write-Host ""
Write-Host "[5/7] Installing audio processing libraries..." -ForegroundColor Yellow
python -m pip install librosa>=0.10.2 soundfile>=0.12.1
Write-Host "✓ Audio libraries installed" -ForegroundColor Green

# Step 6: Install ML Models
Write-Host ""
Write-Host "[6/7] Installing ML models..." -ForegroundColor Yellow

Write-Host "  Installing Demucs..." -ForegroundColor Cyan
python -m pip install demucs>=4.1.0
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✓ Demucs installed" -ForegroundColor Green
}

if ($rustAvailable) {
    Write-Host "  Installing DeepFilterNet (with Rust)..." -ForegroundColor Cyan
    Write-Host "    This may take 5-15 minutes..." -ForegroundColor Gray
    python -m pip install deepfilternet>=0.5.6
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ DeepFilterNet installed" -ForegroundColor Green
    } else {
        Write-Host "    ⚠ DeepFilterNet installation failed (will use fallback)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ Skipping DeepFilterNet (Rust not available)" -ForegroundColor Yellow
    Write-Host "    Fallback implementation will be used" -ForegroundColor Gray
}

# Step 7: Install Utilities
Write-Host ""
Write-Host "[7/7] Installing utilities..." -ForegroundColor Yellow
python -m pip install pyloudnorm>=0.1.1 supabase>=2.10.0 tqdm>=4.67.0 python-dotenv>=1.0.1
Write-Host "✓ Utilities installed" -ForegroundColor Green

# Verification
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allInstalled = $true

$packages = @(
    @{name="torch"; import="torch"},
    @{name="librosa"; import="librosa"},
    @{name="demucs"; import="demucs"},
    @{name="pyloudnorm"; import="pyloudnorm"}
)

foreach ($pkg in $packages) {
    try {
        python -c "import $($pkg.import)" 2>$null
        Write-Host "✓ $($pkg.name) installed" -ForegroundColor Green
    } catch {
        Write-Host "✗ $($pkg.name) NOT installed" -ForegroundColor Red
        $allInstalled = $false
    }
}

if ($rustAvailable) {
    try {
        python -c "import deepfilternet" 2>$null
        Write-Host "✓ DeepFilterNet installed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ DeepFilterNet not installed (fallback available)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ DeepFilterNet skipped (Rust required)" -ForegroundColor Yellow
}

Write-Host ""
if ($allInstalled) {
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
    Write-Host ""
    Write-Host "Some packages may not be installed correctly." -ForegroundColor Yellow
    Write-Host "Check the errors above and try installing manually." -ForegroundColor Yellow
}

Write-Host ""

