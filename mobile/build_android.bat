@echo off
echo Building Android APK...
echo.

cd /d %~dp0

echo Step 1: Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Creating local.properties if needed...
if not exist "android\local.properties" (
    echo Creating local.properties...
    echo Please update the SDK path in android\local.properties
    echo sdk.dir=C:\\Users\\HP\\AppData\\Local\\Android\\Sdk > android\local.properties
)

echo.
echo Step 3: Cleaning previous build...
cd android
call gradlew.bat clean
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Clean failed, continuing anyway...
)

echo.
echo Step 4: Building Release APK...
call gradlew.bat assembleRelease
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying Debug build instead...
    call gradlew.bat assembleDebug
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Build failed!
        echo.
        echo Common fixes:
        echo 1. Check Android SDK path in android\local.properties
        echo 2. Ensure Java JDK 17+ is installed
        echo 3. Run: cd android ^&^& gradlew clean
        echo 4. Check that all dependencies are installed: npm install
        pause
        exit /b 1
    )
    set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
    set BUILD_TYPE=Debug
) else (
    set APK_PATH=android\app\build\outputs\apk\release\app-release.apk
    set BUILD_TYPE=Release
)

cd ..

echo.
echo ========================================
echo Build successful! (%BUILD_TYPE%)
echo.
echo APK location:
echo %APK_PATH%
echo.
echo To install on connected device:
echo adb install %APK_PATH%
echo.
echo To sign the release APK (if needed):
echo 1. Generate keystore: keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
echo 2. Update android\app\build.gradle with signing config
echo.
pause

