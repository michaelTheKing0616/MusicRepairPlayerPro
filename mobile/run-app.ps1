# Run React Native App Script
# Starts Metro bundler and runs on Android/iOS

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("android", "ios")]
    [string]$Platform = "android",
    
    [switch]$ResetCache = $false,
    [switch]$NoBundler = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Music Repair App - Runner" -ForegroundColor Cyan
Write-Host "Platform: $Platform" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Must run from mobile directory!" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Please run: cd mobile" -ForegroundColor Yellow
    exit 1
}

# Check prerequisites
Write-Host "Checking Prerequisites..." -ForegroundColor Cyan
if (Test-Path "build-helpers\check-prerequisites.ps1") {
    . .\build-helpers\check-prerequisites.ps1
}
Write-Host ""

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Setup Android if needed
if ($Platform -eq "android") {
    $localPropsPath = "android\local.properties"
    if (-not (Test-Path $localPropsPath)) {
        Write-Host "Setting up Android configuration..." -ForegroundColor Cyan
        if (Test-Path "build-helpers\setup-android.ps1") {
            . .\build-helpers\setup-android.ps1
        }
        Write-Host ""
    }
}

# Start Metro bundler if not skipped
if (-not $NoBundler) {
    Write-Host "Starting Metro bundler..." -ForegroundColor Cyan
    Write-Host ""
    
    if ($ResetCache) {
        Write-Host "   Resetting cache..." -ForegroundColor Yellow
        $metroProcess = Start-Process -FilePath "npx" -ArgumentList "react-native", "start", "--reset-cache" -PassThru -NoNewWindow
    } else {
        $metroProcess = Start-Process -FilePath "npx" -ArgumentList "react-native", "start" -PassThru -NoNewWindow
    }
    
    Write-Host "   Metro bundler started (PID: $($metroProcess.Id))" -ForegroundColor Green
    Write-Host "   Waiting 5 seconds for bundler to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Write-Host ""
}

# Run the app
Write-Host "Running app on $Platform..." -ForegroundColor Cyan
Write-Host ""

if ($Platform -eq "android") {
    # Check if device/emulator is connected
    $adbCheck = Get-Command adb -ErrorAction SilentlyContinue
    if ($null -ne $adbCheck) {
        $devices = adb devices | Select-String "device$"
        if ($null -eq $devices) {
            Write-Host "WARNING: No Android device/emulator detected!" -ForegroundColor Yellow
            Write-Host "   Please start an emulator or connect a device." -ForegroundColor Yellow
            Write-Host "   Waiting 10 seconds before continuing..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        }
    }
    
    npx react-native run-android
    $buildExitCode = $LASTEXITCODE
} else {
    npx react-native run-ios
    $buildExitCode = $LASTEXITCODE
}

if ($buildExitCode -eq 0) {
    Write-Host ""
    Write-Host "App launched successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tips:" -ForegroundColor Cyan
    Write-Host "   - Press 'r' in Metro bundler to reload" -ForegroundColor Yellow
    Write-Host "   - Press 'd' to open developer menu" -ForegroundColor Yellow
    Write-Host "   - Press Ctrl+C to stop Metro bundler" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Failed to run app!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    if ($Platform -eq "android") {
        Write-Host "  - No device/emulator connected" -ForegroundColor Yellow
        Write-Host "  - Android SDK not configured (run setup-android.ps1)" -ForegroundColor Yellow
        Write-Host "  - Gradle sync failed (try: cd android && gradlew clean)" -ForegroundColor Yellow
    } else {
        Write-Host "  - Xcode not installed" -ForegroundColor Yellow
        Write-Host "  - CocoaPods not installed (run: cd ios && pod install)" -ForegroundColor Yellow
        Write-Host "  - No iOS simulator available" -ForegroundColor Yellow
    }
    exit 1
}
