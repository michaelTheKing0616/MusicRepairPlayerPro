@echo off
echo ========================================
echo Generating Gradle Wrapper
echo ========================================
echo.

cd /d %~dp0

echo Current directory: %CD%
echo.

if exist "android\gradlew.bat" (
    echo Gradle wrapper already exists!
    echo Location: android\gradlew.bat
    pause
    exit /b 0
)

echo Gradle wrapper NOT found. Generating...
echo.

echo This will run: npx react-native run-android
echo It will generate the wrapper files we need.
echo You can cancel (Ctrl+C) once you see it starting to build.
echo.
pause

echo Running React Native to generate wrapper...
call npx react-native run-android

if exist "android\gradlew.bat" (
    echo.
    echo ========================================
    echo SUCCESS! Gradle wrapper generated!
    echo ========================================
    echo.
    echo Now you can run: .\build_android.bat
) else (
    echo.
    echo WARNING: Gradle wrapper still not found.
    echo The command may still be running or failed.
    echo.
    echo Try checking manually:
    echo   dir android\gradlew.bat
)

pause

