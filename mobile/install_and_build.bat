@echo off
echo ========================================
echo Installing Dependencies and Building APK
echo ========================================
echo.

cd /d %~dp0

echo Step 1: Installing @react-native-community/cli...
call npm install @react-native-community/cli@latest --save-dev
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install @react-native-community/cli
    pause
    exit /b 1
)
echo OK
echo.

echo Step 2: Verifying installation...
call npm list @react-native-community/cli
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Package not found, but continuing...
)
echo.

echo Step 3: Generating Gradle wrapper (if needed)...
if not exist "android\gradlew.bat" (
    echo Gradle wrapper not found. Attempting to generate...
    cd android
    if exist "gradlew.bat" (
        echo Using existing gradlew.bat
    ) else (
        echo Please run: npx react-native run-android (this will generate wrapper)
        echo OR manually create gradle wrapper
    )
    cd ..
) else (
    echo Gradle wrapper exists - OK
)
echo.

echo Step 4: Attempting to run React Native setup...
echo This will generate missing Android files if needed...
call npx react-native run-android --no-packager 2>&1 | findstr /C:"BUILD" /C:"SUCCESS" /C:"FAILED" /C:"ERROR" /C:"gradle"
if %ERRORLEVEL% EQU 0 (
    echo React Native setup completed
) else (
    echo React Native setup had issues, but continuing to build...
)
echo.

echo Step 5: Building APK...
echo.
call .\build_android.bat
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo Build failed!
    echo ========================================
    echo.
    echo Try these steps manually:
    echo 1. cd android
    echo 2. gradlew.bat clean
    echo 3. gradlew.bat assembleDebug
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo All steps completed!
echo ========================================
pause

