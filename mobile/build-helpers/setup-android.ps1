# Android Setup Script
# Creates local.properties file with correct Android SDK path

Write-Host "🔧 Setting up Android configuration..." -ForegroundColor Cyan
Write-Host ""

# Try to find Android SDK
$possiblePaths = @(
    "$env:ANDROID_HOME",
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk"
)

$sdkPath = $null
foreach ($path in $possiblePaths) {
    if ($path -and (Test-Path $path)) {
        $sdkPath = $path
        break
    }
}

if (-not $sdkPath) {
    Write-Host "❌ Android SDK not found!" -ForegroundColor Red
    Write-Host "Please install Android Studio and Android SDK first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Expected locations:" -ForegroundColor Yellow
    foreach ($path in $possiblePaths) {
        if ($path) {
            Write-Host "  - $path" -ForegroundColor Gray
        }
    }
    exit 1
}

Write-Host "Found Android SDK at: $sdkPath" -ForegroundColor Green

# Create local.properties
$localPropsPath = "android\local.properties"
$localPropsContent = "sdk.dir=$($sdkPath -replace '\\', '\\')"

# Create android directory if it doesn't exist
$androidDir = "android"
if (-not (Test-Path $androidDir)) {
    New-Item -ItemType Directory -Path $androidDir | Out-Null
}

# Write local.properties
Set-Content -Path $localPropsPath -Value $localPropsContent -Force

Write-Host "✅ Created $localPropsPath" -ForegroundColor Green
Write-Host "   Content: $localPropsContent" -ForegroundColor Gray
Write-Host ""


