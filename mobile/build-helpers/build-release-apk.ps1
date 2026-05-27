# Build Release APK Script
# Builds a signed release APK for distribution

param(
    [switch]$Clean = $false,
    [switch]$GenerateKey = $false
)

Write-Host "🏭 Building Release APK..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from mobile directory!" -ForegroundColor Red
    exit 1
}

# Check if keystore exists
$keystorePath = "android\app\my-release-key.keystore"
if ($GenerateKey -or -not (Test-Path $keystorePath)) {
    Write-Host "🔑 Generating signing key..." -ForegroundColor Cyan
    Write-Host "   You will be prompted for a password. Remember it!" -ForegroundColor Yellow
    Write-Host ""
    
    $keystoreDir = "android\app"
    if (-not (Test-Path $keystoreDir)) {
        New-Item -ItemType Directory -Path $keystoreDir | Out-Null
    }
    
    keytool -genkeypair -v -storetype PKCS12 -keystore $keystorePath -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Key generation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Check gradle.properties
$gradlePropsPath = "android\gradle.properties"
$needGradleProps = $false

if (-not (Test-Path $gradlePropsPath)) {
    $needGradleProps = $true
} else {
    $gradleProps = Get-Content $gradlePropsPath -Raw
    if ($gradleProps -notmatch "MYAPP_RELEASE_STORE_PASSWORD") {
        $needGradleProps = $true
    }
}

if ($needGradleProps) {
    Write-Host "⚠️  gradle.properties needs signing configuration" -ForegroundColor Yellow
    Write-Host "   Please add these lines to android\gradle.properties:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore" -ForegroundColor Cyan
    Write-Host "   MYAPP_RELEASE_KEY_ALIAS=my-key-alias" -ForegroundColor Cyan
    Write-Host "   MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password" -ForegroundColor Cyan
    Write-Host "   MYAPP_RELEASE_KEY_PASSWORD=your_key_password" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Press Enter after adding these lines..." -ForegroundColor Yellow
    Read-Host
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
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

# Build release APK
Write-Host "🔨 Building release APK (this may take a few minutes)..." -ForegroundColor Cyan
.\gradlew assembleRelease

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "📦 APK Location: $(Resolve-Path $apkPath)" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
        Write-Host ""
        Write-Host "This APK is ready for distribution!" -ForegroundColor Green
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


