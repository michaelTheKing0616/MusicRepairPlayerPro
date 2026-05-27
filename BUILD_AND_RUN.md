# 🚀 Build and Run Guide

## Quick Start

### Build APK

**Option 1: Using Script (Recommended)**
```powershell
cd mobile
.\build-apk.ps1
```

**Option 2: Using Batch File**
```batch
cd mobile
build-apk.bat
```

**Option 3: Manual Build**
```bash
cd mobile
cd android
gradlew.bat assembleDebug      # Windows
# or
./gradlew assembleDebug        # Linux/Mac
```

---

### Run App

**Option 1: Using Script (Recommended)**
```powershell
cd mobile
.\run-app.ps1
```

**Option 2: Using Batch File**
```batch
cd mobile
run-app.bat
```

**Option 3: Manual Run**
```bash
cd mobile
npm start                      # Terminal 1: Start Metro
npm run android                # Terminal 2: Run on Android
```

---

## Script Details

### build-apk.ps1

Builds Android APK with options:

```powershell
# Basic usage
.\build-apk.ps1

# Build release APK
.\build-apk.ps1 -BuildType release

# Clean build
.\build-apk.ps1 -Clean

# Build and install on device
.\build-apk.ps1 -Install

# All options
.\build-apk.ps1 -BuildType release -Clean -Install
```

**Parameters:**
- `-BuildType`: "debug" or "release" (default: debug)
- `-Clean`: Clean previous builds first
- `-Install`: Install APK on connected device after build
- `-SkipDependencies`: Skip npm install check

**Output:**
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`

---

### run-app.ps1

Runs the app on Android/iOS:

```powershell
# Run on Android
.\run-app.ps1

# Run on iOS
.\run-app.ps1 -Platform ios

# Reset cache
.\run-app.ps1 -ResetCache

# Don't start Metro (if already running)
.\run-app.ps1 -NoBundler
```

**Parameters:**
- `-Platform`: "android" or "ios" (default: android)
- `-ResetCache`: Reset Metro bundler cache
- `-NoBundler`: Don't start Metro bundler

---

## First Time Setup

### 1. Check Prerequisites
```powershell
cd mobile
.\build-helpers\check-prerequisites.ps1
```

**Required:**
- ✅ Node.js 18+
- ✅ Java JDK 17
- ✅ Android Studio (Android SDK)
- ✅ ANDROID_HOME environment variable

### 2. Setup Android
```powershell
.\build-helpers\setup-android.ps1
```

This creates `android/local.properties` with your SDK path.

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Android Emulator
- Open Android Studio
- Tools → Device Manager
- Start an emulator or connect USB device
- Verify: `adb devices`

---

## Troubleshooting

### Build Fails

**Issue: Gradle wrapper not found**
```powershell
# Generate gradle wrapper
cd mobile/android
npx @react-native-community/cli-platform-android generate-gradle-wrapper
```

**Issue: Java version mismatch**
```bash
# Check Java version (should be 17)
java -version

# Set JAVA_HOME if needed
# Windows: System Properties → Environment Variables
# Add JAVA_HOME pointing to JDK 17
```

**Issue: Android SDK not found**
```powershell
# Run setup script
.\build-helpers\setup-android.ps1

# Or manually create android/local.properties:
# sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

**Issue: Build errors**
```bash
# Clean build
cd mobile/android
gradlew.bat clean
cd ..
.\build-apk.ps1 -Clean
```

---

### App Won't Run

**Issue: No device found**
```bash
# Check connected devices
adb devices

# Start emulator from Android Studio
# Or connect USB device with USB debugging enabled
```

**Issue: Metro bundler errors**
```powershell
# Reset cache
.\run-app.ps1 -ResetCache

# Or manually
npm start -- --reset-cache
```

**Issue: App crashes on launch**
```bash
# Check logs
adb logcat | grep -i error

# Clear app data
adb shell pm clear com.musicrepairapp

# Reinstall
.\build-apk.ps1 -Install
```

---

## APK Installation

### On Device via USB
```bash
# After building
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Or use script
.\build-apk.ps1 -Install
```

### Manual Installation
1. Transfer APK to device
2. Enable "Install from Unknown Sources"
3. Open APK file
4. Install

---

## Build Types

### Debug APK
- ✅ Includes debugging symbols
- ✅ Larger file size
- ✅ Faster build time
- ✅ For testing and development

### Release APK
- ✅ Optimized and minified
- ✅ Smaller file size
- ✅ Requires signing key
- ✅ For distribution

**Note:** Release APK requires signing configuration. See `COMPLETE_BUILD_GUIDE.md` for details.

---

## Common Commands

```powershell
# Check prerequisites
.\build-helpers\check-prerequisites.ps1

# Setup Android
.\build-helpers\setup-android.ps1

# Build debug APK
.\build-apk.ps1

# Build release APK
.\build-apk.ps1 -BuildType release

# Run app
.\run-app.ps1

# Clean and rebuild
.\build-apk.ps1 -Clean

# Check connected devices
adb devices

# View logs
adb logcat
```

---

## Next Steps

After building:

1. **Test APK** on device
2. **Sign Release APK** for Play Store
3. **Build App Bundle** for Play Store: `gradlew.bat bundleRelease`
4. **Upload to Play Store** or distribute directly

---

**For detailed build instructions, see `COMPLETE_BUILD_GUIDE.md`**

