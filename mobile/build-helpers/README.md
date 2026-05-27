# Build Helper Scripts

These PowerShell scripts help automate the build process for the Music Repair App.

## Prerequisites

- PowerShell 5.1+ (Windows 10/11)
- All build prerequisites installed (see COMPLETE_BUILD_GUIDE.md)

## Available Scripts

### 1. `check-prerequisites.ps1`
Checks if all required tools are installed.

```powershell
.\build-helpers\check-prerequisites.ps1
```

**What it checks:**
- Node.js (18+)
- npm
- Java (17)
- Android SDK (ANDROID_HOME)
- ADB (optional)
- local.properties file

---

### 2. `setup-android.ps1`
Creates `local.properties` file with correct Android SDK path.

```powershell
.\build-helpers\setup-android.ps1
```

**What it does:**
- Finds Android SDK automatically
- Creates `android/local.properties`
- Sets correct SDK path

---

### 3. `build-debug-apk.ps1`
Builds a debug APK for testing.

```powershell
# Basic build
.\build-helpers\build-debug-apk.ps1

# Clean build (removes previous builds first)
.\build-helpers\build-debug-apk.ps1 -Clean
```

**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

### 4. `build-release-apk.ps1`
Builds a signed release APK for distribution.

```powershell
# Basic build (requires signing configured)
.\build-helpers\build-release-apk.ps1

# Clean build
.\build-helpers\build-release-apk.ps1 -Clean

# Generate new signing key first
.\build-helpers\build-release-apk.ps1 -GenerateKey
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

**Note:** First time use requires:
1. Generating keystore (use `-GenerateKey` flag)
2. Adding signing config to `android/gradle.properties`

---

## Quick Start Workflow

### For Testing (Debug APK):

```powershell
# 1. Check prerequisites
cd C:\Users\HP\Desktop\MusicRepairApp\mobile
.\build-helpers\check-prerequisites.ps1

# 2. Setup Android (if needed)
.\build-helpers\setup-android.ps1

# 3. Build debug APK
.\build-helpers\build-debug-apk.ps1
```

### For Production (Release APK):

```powershell
# 1. Check prerequisites
cd C:\Users\HP\Desktop\MusicRepairApp\mobile
.\build-helpers\check-prerequisites.ps1

# 2. Setup Android (if needed)
.\build-helpers\setup-android.ps1

# 3. Generate signing key (first time only)
.\build-helpers\build-release-apk.ps1 -GenerateKey

# 4. Configure gradle.properties (add passwords)
# Edit android/gradle.properties manually

# 5. Build release APK
.\build-helpers\build-release-apk.ps1
```

---

## Troubleshooting

### Script Execution Policy Error

If you get "execution of scripts is disabled":

```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Script Not Found

Make sure you're in the `mobile` directory:

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\mobile
```

### Build Failures

Check the error output. Common issues:
- Missing `local.properties` → Run `setup-android.ps1`
- Missing dependencies → Run `npm install` first
- Java version wrong → Install Java 17
- Gradle sync issues → Run with `-Clean` flag

---

## Manual Build (Alternative)

If scripts don't work, follow the manual steps in `COMPLETE_BUILD_GUIDE.md`.


