# Build Android APK Script
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("debug", "release")]
    [string]$BuildType = "debug",
    [switch]$Clean = $false,
    [switch]$Install = $false,
    [switch]$SkipDependencies = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Music Repair App - APK Builder" -ForegroundColor Cyan
Write-Host "Build Type: $BuildType" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Must run from mobile directory!" -ForegroundColor Red
    exit 1
}

Write-Host "Checking Prerequisites..." -ForegroundColor Cyan
if (Test-Path "build-helpers\check-prerequisites.ps1") {
    . .\build-helpers\check-prerequisites.ps1
}
Write-Host ""

if (-not $SkipDependencies) {
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "npm install failed!" -ForegroundColor Red
            exit 1
        }
        Write-Host ""
    }
}

$localPropsPath = "android\local.properties"
if (-not (Test-Path $localPropsPath)) {
    Write-Host "Setting up Android configuration..." -ForegroundColor Cyan
    if (Test-Path "build-helpers\setup-android.ps1") {
        . .\build-helpers\setup-android.ps1
    }
    Write-Host ""
}

Set-Location android

if ($Clean) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Cyan
    if (Test-Path "gradlew.bat") {
        .\gradlew.bat clean
    }
    Write-Host ""
}

Write-Host "Building $BuildType APK..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "gradlew.bat") {
    if ($BuildType -eq "release") {
        .\gradlew.bat assembleRelease
    } else {
        .\gradlew.bat assembleDebug
    }
    $buildSuccess = $LASTEXITCODE -eq 0
} else {
    Write-Host "Gradle wrapper not found. Using React Native CLI..." -ForegroundColor Yellow
    Set-Location ..
    if ($BuildType -eq "release") {
        npx react-native build-android --mode=release
    } else {
        npx react-native build-android
    }
    $buildSuccess = $LASTEXITCODE -eq 0
    Set-Location android
}

if ($buildSuccess) {
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host ""
    
    $apkPath = if ($BuildType -eq "release") {
        "app\build\outputs\apk\release\app-release.apk"
    } else {
        "app\build\outputs\apk\debug\app-debug.apk"
    }
    
    if (Test-Path $apkPath) {
        $fullPath = Resolve-Path $apkPath
        $apkSize = (Get-Item $fullPath).Length / 1MB
        
        Write-Host "APK Location: $fullPath" -ForegroundColor Green
        Write-Host "Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
        Write-Host ""
        
        Start-Process explorer.exe -ArgumentList "/select,`"$fullPath`""
        
        if ($Install) {
            Write-Host "Installing on device..." -ForegroundColor Cyan
            $adbCheck = Get-Command adb -ErrorAction SilentlyContinue
            if ($null -ne $adbCheck) {
                $devices = adb devices | Select-String "device$"
                if ($null -ne $devices) {
                    adb install -r $fullPath
                } else {
                    Write-Host "No device connected" -ForegroundColor Yellow
                }
            }
        }
    }
} else {
    Write-Host ""
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..
