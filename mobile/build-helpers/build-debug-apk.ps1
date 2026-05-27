# Build Debug APK Script
# Builds a debug APK for testing

param(
    [switch]$Clean = $false
)

Write-Host "🔨 Building Debug APK..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from mobile directory!" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Change to android directory
Set-Location android

# Clean if requested
if ($Clean) {
    Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Cyan
    .\gradlew clean
    Write-Host ""
}

# Build debug APK
Write-Host "🔨 Building debug APK (this may take a few minutes)..." -ForegroundColor Cyan
.\gradlew assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "📦 APK Location: $(Resolve-Path $apkPath)" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
        Write-Host ""
        Write-Host "To install on device:" -ForegroundColor Cyan
        Write-Host "  adb install $apkPath" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  APK file not found at expected location" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ Build failed! Check the error messages above." -ForegroundColor Red
    exit 1
}

# Return to original directory
Set-Location ..


