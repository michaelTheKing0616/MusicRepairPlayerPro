# 🚀 Quick Start Guide

## Building APK

### Windows PowerShell
```powershell
# Build debug APK
.\build-apk.ps1

# Build release APK
.\build-apk.ps1 -BuildType release

# Build and install on connected device
.\build-apk.ps1 -BuildType debug -Install

# Clean build (removes previous builds first)
.\build-apk.ps1 -BuildType debug -Clean
```

### Windows Batch (Double-click)
```batch
# Build debug APK
build-apk.bat

# Build release APK
build-apk.bat release

# Build and install
build-apk.bat debug -install
```

### Manual Build
```bash
cd android
gradlew assembleDebug      # For debug APK
gradlew assembleRelease    # For release APK
```

**APK Location:**
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

---

## Running the App

### Windows PowerShell
```powershell
# Run on Android
.\run-app.ps1

# Run on iOS (Mac only)
.\run-app.ps1 -Platform ios

# Run with cache reset
.\run-app.ps1 -ResetCache

# Run without Metro bundler (if already running)
.\run-app.ps1 -NoBundler
```

### Windows Batch (Double-click)
```batch
# Run on Android
run-app.bat

# Run on iOS
run-app.bat ios
```

### Manual Run
```bash
# Start Metro bundler (in one terminal)
npm start

# Run on Android (in another terminal)
npm run android

# Run on iOS
npm run ios
```

---

## First Time Setup

1. **Install Prerequisites**
   - Node.js 18+
   - Java JDK 17
   - Android Studio (Android SDK)
   - (For iOS) Xcode

2. **Check Prerequisites**
   ```powershell
   .\build-helpers\check-prerequisites.ps1
   ```

3. **Setup Android**
   ```powershell
   .\build-helpers\setup-android.ps1
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Start Android Emulator** (or connect device)
   - Open Android Studio
   - Tools → Device Manager
   - Start an emulator or connect USB device

---

## Troubleshooting

### Build Fails
- ✅ Check prerequisites: `.\build-helpers\check-prerequisites.ps1`
- ✅ Clean build: `.\build-apk.ps1 -Clean`
- ✅ Check Android SDK: `.\build-helpers\setup-android.ps1`
- ✅ Check Java version: `java -version` (should be 17)

### App Won't Run
- ✅ Start Metro bundler: `npm start`
- ✅ Check device connection: `adb devices`
- ✅ Reset cache: `.\run-app.ps1 -ResetCache`
- ✅ Rebuild: `cd android && gradlew clean && cd .. && npm run android`

### APK Not Found
- Check build output for errors
- Look in: `android/app/build/outputs/apk/`
- Run with verbose: `gradlew assembleDebug --info`

---

## Script Options

### build-apk.ps1
- `-BuildType` - "debug" or "release" (default: debug)
- `-Clean` - Clean previous builds first
- `-Install` - Install APK on connected device after build
- `-SkipDependencies` - Skip npm install check

### run-app.ps1
- `-Platform` - "android" or "ios" (default: android)
- `-ResetCache` - Reset Metro bundler cache
- `-NoBundler` - Don't start Metro bundler (use existing)

---

## Quick Commands Reference

```powershell
# Check if everything is ready
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
```

---

**Happy Building! 🎉**

