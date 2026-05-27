@echo off
echo ========================================
echo Checking Build Setup
echo ========================================
echo.

echo Step 1: Checking Node.js...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found!
    exit /b 1
)
echo OK
echo.

echo Step 2: Checking npm...
npm --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found!
    exit /b 1
)
echo OK
echo.

echo Step 3: Checking if node_modules exists...
if exist "node_modules" (
    echo OK - node_modules folder exists
) else (
    echo WARNING: node_modules not found - need to run npm install
)
echo.

echo Step 4: Checking package.json...
if exist "package.json" (
    echo OK - package.json exists
    type package.json | findstr "react-native-get-music-files"
) else (
    echo ERROR: package.json not found!
    exit /b 1
)
echo.

echo Step 5: Checking Android SDK path...
if exist "android\local.properties" (
    echo OK - local.properties exists
    type android\local.properties
) else (
    echo WARNING: local.properties not found - will be created during build
)
echo.

echo Step 6: Checking Java...
java -version 2>&1 | findstr "version"
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Java not found or not in PATH
) else (
    echo OK
)
echo.

echo Step 7: Checking Gradle wrapper...
if exist "android\gradlew.bat" (
    echo OK - Gradle wrapper exists
) else (
    echo ERROR: Gradle wrapper not found!
    exit /b 1
)
echo.

echo ========================================
echo Setup check complete!
echo ========================================
pause

