# Prerequisites Check Script for Music Repair App
# This script checks if all required tools are installed

Write-Host "Checking Prerequisites..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajor -ge 18) {
        Write-Host " OK: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host " ERROR: Version $nodeVersion (Need 18+)" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host " ERROR: Not installed" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    $allGood = $false
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npmVersion = npm --version
    Write-Host " OK: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host " ERROR: Not installed" -ForegroundColor Red
    $allGood = $false
}

# Check Java
Write-Host "Checking Java..." -NoNewline
try {
    $javaOutput = java -version 2>&1 | Out-String
    if ($javaOutput -match 'version "17') {
        Write-Host " OK: Java 17 detected" -ForegroundColor Green
    } elseif ($javaOutput -match 'version "(1[89]|[2-9]\d)') {
        $version = $matches[0]
        Write-Host " WARNING: $version (Should be Java 17 for React Native 0.76)" -ForegroundColor Yellow
    } else {
        Write-Host " ERROR: Java 17 not found" -ForegroundColor Red
        Write-Host "   Install from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host " ERROR: Not installed" -ForegroundColor Red
    Write-Host "   Install Java 17 from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Yellow
    $allGood = $false
}

# Check ANDROID_HOME
Write-Host "Checking ANDROID_HOME..." -NoNewline
$androidHome = $env:ANDROID_HOME
if ($androidHome -and (Test-Path $androidHome)) {
    Write-Host " OK: $androidHome" -ForegroundColor Green
} else {
    Write-Host " ERROR: Not set" -ForegroundColor Red
    Write-Host "   Set ANDROID_HOME to your Android SDK path" -ForegroundColor Yellow
    Write-Host "   Usually: C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" -ForegroundColor Yellow
    $allGood = $false
}

# Check ADB
Write-Host "Checking ADB..." -NoNewline
try {
    $adbVersion = adb version 2>&1 | Select-Object -First 1
    Write-Host " OK: Installed" -ForegroundColor Green
} catch {
    Write-Host " WARNING: Not found (optional, for device installation)" -ForegroundColor Yellow
}

# Check if local.properties exists
Write-Host "Checking local.properties..." -NoNewline
$localPropsPath = "android\local.properties"
if (Test-Path $localPropsPath) {
    Write-Host " OK: Found" -ForegroundColor Green
} else {
    Write-Host " WARNING: Not found (will be created)" -ForegroundColor Yellow
}

Write-Host ""
if ($allGood) {
    Write-Host "SUCCESS: All prerequisites met! Ready to build." -ForegroundColor Green
} else {
    Write-Host "ERROR: Some prerequisites are missing. Please install them first." -ForegroundColor Red
}
Write-Host ""

