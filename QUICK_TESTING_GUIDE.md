# Quick Testing Guide - Android & iOS

## 🐛 Fix DeepFilterNet Installation Issue

The error shows DeepFilterNet requires Rust. Here are your options:

### Quick Fix: Skip DeepFilterNet for Now

```bash
cd ml
# Install everything except DeepFilterNet
pip install torch torchaudio numpy scipy librosa soundfile demucs pyloudnorm supabase tqdm python-dotenv
```

**Result**: Pipeline will use fallback denoising (works, lower quality). You can add DeepFilterNet later.

### Full Install: Add Rust

```bash
# Install Rust (Windows)
# Download from: https://rustup.rs/
# Or run:
# winget install Rustlang.Rustup

# After Rust installed:
cd ml
pip install -r requirements.txt
```

## 📱 Android APK Generation

### Quick Build (5 minutes)

#### 1. Install Prerequisites

**Check if you have:**
```bash
java -version  # Need Java 17+
adb version    # Need Android SDK
```

**If missing, install:**
- Android Studio: https://developer.android.com/studio
- Java JDK 17: https://adoptium.net/

#### 2. Set Android SDK Path

**Windows PowerShell:**
```powershell
# Find your Android SDK path (usually):
# C:\Users\YourName\AppData\Local\Android\Sdk

# Create local.properties
cd mobile\android
echo "sdk.dir=C:\\Users\\HP\\AppData\\Local\\Android\\Sdk" > local.properties
cd ..\..
```

#### 3. Build Debug APK

```bash
cd mobile

# Install dependencies
npm install

# Build APK
cd android
gradlew assembleDebug

# APK will be at:
# mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

#### 4. Install on Device

**Via USB:**
```bash
# Enable USB debugging on your Android phone
# Connect via USB
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Via File Transfer:**
- Copy APK to phone
- Open on phone
- Enable "Install from Unknown Sources"
- Install

### Full Release Build

#### 1. Generate Signing Key

```bash
cd mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore musicrepair.keystore -alias musicrepair -keyalg RSA -keysize 2048 -validity 10000

# Remember the passwords you set!
```

#### 2. Configure Signing

Create/update `mobile/android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=musicrepair.keystore
MYAPP_RELEASE_KEY_ALIAS=musicrepair
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

#### 3. Build Release APK

```bash
cd mobile/android
gradlew assembleRelease

# APK: mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 🍎 iOS Build

### Prerequisites
- macOS (required)
- Xcode installed
- CocoaPods installed

### Steps

```bash
cd mobile

# Install dependencies
npm install

# iOS dependencies
cd ios
pod install
cd ..

# Build and run
npm run ios

# Or open in Xcode:
open ios/MusicRepairApp.xcworkspace
```

## 🧪 Testing Checklist

### Before Testing

1. **Backend Running:**
   ```bash
   cd backend
   npm run dev
   # Should be on http://localhost:3000
   ```

2. **Update API URL for Device:**
   
   Edit `mobile/src/services/api.ts`:
   ```typescript
   // For Android Emulator:
   const API_BASE_URL = 'http://10.0.2.2:3000/api';
   
   // For iOS Simulator:
   const API_BASE_URL = 'http://localhost:3000/api';
   
   // For Physical Device (use your computer's IP):
   const API_BASE_URL = 'http://192.168.1.100:3000/api';
   ```

3. **Start Metro Bundler:**
   ```bash
   cd mobile
   npm start
   ```

### Test Features

- [ ] App launches
- [ ] Login/Register works
- [ ] Upload audio file
- [ ] Start repair (check progress animation)
- [ ] A/B preview works
- [ ] Play audio files
- [ ] Enhancement settings
- [ ] Export/download
- [ ] Hands-free toggle
- [ ] Waveform preview

## 🔧 Quick Fixes

### Build Errors

**Android:**
```bash
cd mobile/android
gradlew clean
cd ../..
rm -rf node_modules
npm install
npm run android
```

**iOS:**
```bash
cd mobile/ios
rm -rf Pods Podfile.lock
pod install
cd ../..
npm run ios
```

### Metro Bundler Issues
```bash
cd mobile
npm start -- --reset-cache
```

### Can't Connect to Backend
- Check backend is running
- Check firewall settings
- Use correct IP address for physical device
- Test with: `curl http://YOUR_IP:3000/health`

## 📋 Minimal Test Setup

### Just Want to Test UI?

1. **Mock Backend Response** - Temporarily hardcode responses
2. **Skip ML Processing** - Test with existing audio files
3. **Build Debug APK** - Fastest way to test

### Full Test Setup

1. **Backend**: Running with PostgreSQL + Supabase
2. **ML Models**: Installed (or using fallbacks)
3. **Mobile**: Debug APK installed
4. **Network**: Device can reach backend

## 🎯 Quick Start (30 minutes)

### Step 1: Backend (5 min)
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your settings
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Step 2: Mobile Dependencies (5 min)
```bash
cd mobile
npm install
```

### Step 3: Build APK (10 min)
```bash
# Setup Android SDK path
cd android
echo "sdk.dir=YOUR_ANDROID_SDK_PATH" > local.properties
cd ..

# Build
cd android
gradlew assembleDebug
```

### Step 4: Install & Test (10 min)
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 🚨 Important Notes

1. **Backend Must Be Running** - App won't work without it
2. **Network Configuration** - Update API URL for your setup
3. **ML Models** - Can use fallbacks for initial testing
4. **Permissions** - Enable file access on device
5. **Supabase** - Must be configured for file uploads

## ✅ You're Ready!

Once APK is built, install it and test all features. Everything is implemented and ready to go! 🚀

