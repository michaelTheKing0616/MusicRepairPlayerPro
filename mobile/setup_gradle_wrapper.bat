@echo off
echo ========================================
echo Setting up Gradle Wrapper
echo ========================================
echo.

cd /d %~dp0

if exist "android\gradlew.bat" (
    echo Gradle wrapper already exists!
    echo You can now run: .\build_android.bat
    pause
    exit /b 0
)

echo Gradle wrapper not found. Generating...
echo.

echo Option 1: Using React Native CLI (Recommended)
echo This will generate the wrapper automatically...
echo.
echo Running: npx react-native run-android
echo You can cancel this after the wrapper is generated (Ctrl+C)
echo.
pause

cd android

echo Attempting to generate Gradle wrapper...
echo.

REM Try to use gradle command if available
where gradle >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using system Gradle...
    gradle wrapper --gradle-version 8.3
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo Gradle wrapper generated successfully!
        echo You can now run: .\build_android.bat
        cd ..
        pause
        exit /b 0
    )
) else (
    echo System Gradle not found.
)

echo.
echo ========================================
echo Manual Setup Required
echo ========================================
echo.
echo The Gradle wrapper files are missing. Please choose one:
echo.
echo OPTION 1 (Easiest):
echo   1. Run: npx react-native run-android
echo   2. Let it generate the wrapper (it will fail at build, that's OK)
echo   3. Cancel when you see it starting to build
echo   4. Then run: .\build_android.bat
echo.
echo OPTION 2 (If you have Gradle installed):
echo   1. Install Gradle: https://gradle.org/install/
echo   2. Run: cd android
echo   3. Run: gradle wrapper --gradle-version 8.3
echo   4. Then run: ..\build_android.bat
echo.
echo OPTION 3 (Download manually):
echo   Download from: https://services.gradle.org/distributions/gradle-8.3-all.zip
echo   Extract gradlew.bat and gradlew to android\ folder
echo   Extract gradle-wrapper.jar to android\gradle\wrapper\ folder
echo.
pause
cd ..

