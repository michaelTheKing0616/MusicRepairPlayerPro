# Complete Setup and Testing Guide

## 🐛 Issue: DeepFilterNet Installation Error

The error you're seeing is because **DeepFilterNet requires Rust** to compile. Here's how to fix it:

### Quick Fix: Skip DeepFilterNet (Works Immediately) ✅

The code already has a **fallback implementation** that works without DeepFilterNet:

```bash
cd ml
# Install everything except DeepFilterNet
pip install torch torchaudio numpy scipy librosa soundfile demucs pyloudnorm supabase tqdm python-dotenv
```

**Or use the script:**
```bash
cd ml
install_skip_deepfilternet.bat
```

The pipeline will use basic noise reduction - **good enough for testing**!

### Full Install: Add Rust (Best Quality) ⭐

If you want the full DeepFilterNet model:

1. **Install Rust:**
   - Download from: https://rustup.rs/
   - Or: `winget install Rustlang.Rustup`
   - Restart terminal after installation

2. **Install all dependencies:**
   ```bash
   cd ml
   install_with_rust.bat
   ```

## 📱 Android APK Generation

### Step 1: Check Prerequisites

Verify you have:
- ✅ Node.js 18+ (`node --version`)
- ✅ Java JDK 17+ (`java -version`)
- ✅ Android Studio installed
- ✅ Android SDK installed

### Step 2: Install Android Dependencies

```bash
cd mobile
npm install
```

### Step 3: Configure Android SDK Path

**Find your Android SDK path** (usually):
- `C:\Users\HP\AppData\Local\Android\Sdk`

**Create `mobile/android/local.properties`:**
```properties
sdk.dir=C\:\\Users\\HP\\AppData\\Local\\Android\\Sdk
```

**Or use the example:**
```bash
cd mobile/android
copy local.properties.example local.properties
# Then edit local.properties with your SDK path
```

### Step 4: Build APK

**Option A: Use the script (easiest)**
```bash
cd mobile
build_android.bat
```

**Option B: Manual build**
```bash
cd mobile/android
gradlew.bat assembleDebug
```

**APK location:**
```
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 5: Install on Device

**Via ADB:**
```bash
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Via File Transfer:**
- Copy APK to phone
- Open on phone
- Enable "Install from Unknown Sources" in Settings
- Install APK

## 🍎 iOS Build (Mac Only)

```bash
cd mobile
npm install
cd ios
pod install
cd ..
npm run ios
```

## 🧪 Testing Setup

### Before Testing

1. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   # Should be running on http://localhost:3000
   ```

2. **Update API URL for Device:**
   
   The code already handles this automatically:
   - **Android Emulator**: Uses `10.0.2.2:3000` automatically
   - **iOS Simulator**: Uses `localhost:3000` automatically
   - **Physical Device**: You need to update manually

   **For Physical Device:**
   1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   2. Edit `mobile/src/services/api.ts`:
      ```typescript
      // Change this line for physical device:
      return 'http://192.168.1.100:3000/api'; // Use your computer's IP
      ```

3. **Start Metro Bundler:**
   ```bash
   cd mobile
   npm start
   ```

### Test Checklist

- [ ] App launches without crashes
- [ ] Can register new account
- [ ] Can login
- [ ] Can upload audio file
- [ ] Can see upload progress
- [ ] Can start repair process
- [ ] Progress animation shows
- [ ] Can view A/B preview
- [ ] Can play original audio
- [ ] Can play repaired audio (after completion)
- [ ] Enhancement settings work
- [ ] Can export/download audio
- [ ] Hands-free toggle works

## 🔧 Common Issues & Fixes

### Build Errors

**"SDK location not found"**
```bash
# Create local.properties with your SDK path
echo sdk.dir=C\:\\Users\\HP\\AppData\\Local\\Android\\Sdk > mobile/android/local.properties
```

**"Gradle build failed"**
```bash
cd mobile/android
gradlew.bat clean
cd ../..
npm run android
```

**"Unable to resolve dependency"**
```bash
cd mobile
rm -rf node_modules
npm install
```

### Connection Issues

**"Network request failed"**
- Check backend is running: `curl http://localhost:3000/health`
- Check firewall isn't blocking port 3000
- For physical device, use your computer's IP (not localhost)
- Ensure phone and computer are on same WiFi

**"Cannot connect to backend"**
- Update API URL in `mobile/src/services/api.ts`
- Use `10.0.2.2:3000` for Android emulator
- Use your computer's IP for physical device

### DeepFilterNet Issues

**"Rust not found"**
- Install Rust from https://rustup.rs/
- Or skip DeepFilterNet and use fallback (already implemented)

## 📋 Quick Start (30 Minutes)

### 1. Install ML Dependencies (5 min)

```bash
cd ml
# Skip DeepFilterNet (works immediately)
install_skip_deepfilternet.bat
```

### 2. Start Backend (5 min)

```bash
cd backend
npm install
npm run dev
# Keep this running in one terminal
```

### 3. Build Android APK (15 min)

```bash
cd mobile
npm install
# Configure SDK path in android/local.properties
build_android.bat
```

### 4. Install & Test (5 min)

```bash
# Install on device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or transfer APK manually to phone and install
```

## 🎯 What Works Right Now

✅ All features are implemented:
- A/B preview
- Hands-free toggle
- Live progress animation
- Playlists
- Export/download
- Full player
- Crossfade
- Haptic cues
- Waveform preview
- AI pipeline (with fallback if no DeepFilterNet)

✅ Just needs:
- Backend running
- APK built and installed
- ML models (or use fallback)

## 🚀 Next Steps

1. **For Testing Now:**
   - Skip DeepFilterNet installation
   - Build debug APK
   - Test all features
   - Everything will work with fallback models

2. **For Production:**
   - Install Rust + DeepFilterNet
   - Build release APK
   - Test thoroughly
   - Deploy!

## 📝 Notes

- **Backend must be running** for app to work
- **ML models** run on server (not mobile), so mobile doesn't need them
- **DeepFilterNet** is optional - fallback works fine for testing
- **API URL** is auto-configured for emulator/simulator

## ✅ You're Ready!

Everything is set up! Just:
1. Run the ML install script (skip DeepFilterNet)
2. Start backend
3. Build APK
4. Install and test!

All features are ready to test! 🎉

