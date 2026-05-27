# Android & iOS Build and Testing Guide

## 🚀 Android APK Generation

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ Java JDK 17+ installed
- ✅ Android Studio installed
- ✅ Android SDK configured
- ✅ Environment variables set

### Step 1: Configure Android Environment

1. **Install Android Studio**
   - Download from https://developer.android.com/studio
   - Install Android SDK, SDK Platform, and Build Tools

2. **Set Environment Variables** (Windows)
   ```powershell
   # Add to System Environment Variables:
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Java\jdk-17 (or your JDK path)
   
   # Add to PATH:
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   %ANDROID_HOME%\tools\bin
   %JAVA_HOME%\bin
   ```

3. **Verify Setup**
   ```bash
   java -version  # Should show Java 17+
   adb version    # Android Debug Bridge
   ```

### Step 2: Generate Signing Key (Release APK)

```bash
cd mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Step 3: Configure Gradle

Create `mobile/android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

Update `mobile/android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

### Step 4: Build APK

#### Debug APK (For Testing)
```bash
cd mobile/android
./gradlew assembleDebug
# Output: mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release APK (For Distribution)
```bash
cd mobile/android
./gradlew assembleRelease
# Output: mobile/android/app/build/outputs/apk/release/app-release.apk
```

#### Bundle (For Play Store)
```bash
cd mobile/android
./gradlew bundleRelease
# Output: mobile/android/app/build/outputs/bundle/release/app-release.aab
```

### Step 5: Install APK

**Via ADB:**
```bash
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Via Android Studio:**
- Open `mobile/android` in Android Studio
- Run > Run 'app'
- Select device/emulator

**Direct Install:**
- Transfer APK to device
- Enable "Install from Unknown Sources"
- Open APK file

## 📱 iOS Build

### Prerequisites
- ✅ macOS (required for iOS development)
- ✅ Xcode installed
- ✅ CocoaPods installed
- ✅ Apple Developer Account (for device testing)

### Step 1: Install CocoaPods Dependencies

```bash
cd mobile/ios
pod install
```

### Step 2: Open in Xcode

```bash
open mobile/ios/MusicRepairApp.xcworkspace
```

### Step 3: Configure Signing

1. Select project in Xcode
2. Go to "Signing & Capabilities"
3. Select your development team
4. Xcode will automatically manage signing

### Step 4: Build & Run

**Simulator:**
```bash
cd mobile
npm run ios
```

**Device:**
- Connect iOS device
- Select device in Xcode
- Click Run button

### Step 5: Archive (For App Store)

1. Product > Archive
2. Distribute App
3. Choose distribution method

## 🧪 Testing Setup

### Android Testing

#### 1. Enable Developer Options
- Settings > About Phone
- Tap "Build Number" 7 times
- Developer options enabled

#### 2. Enable USB Debugging
- Settings > Developer Options
- Enable "USB Debugging"

#### 3. Connect Device
```bash
adb devices  # Should show your device
```

#### 4. Run App
```bash
cd mobile
npm run android
```

### iOS Testing

#### 1. Connect Device
- Connect iPhone/iPad via USB
- Trust computer on device

#### 2. Configure Provisioning
- Open Xcode
- Select your device
- Let Xcode handle provisioning

#### 3. Run App
```bash
cd mobile
npm run ios
```

## 🔧 Build Configuration

### Update App Details

**Android - `mobile/android/app/build.gradle`:**
```gradle
android {
    defaultConfig {
        applicationId "com.musicrepairapp"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

**iOS - `mobile/ios/MusicRepairApp/Info.plist`:**
- Update Bundle Identifier
- Update Display Name
- Update Version

## 📦 Additional Setup

### 1. Install React Native Dependencies

```bash
cd mobile
npm install

# iOS only
cd ios && pod install && cd ..
```

### 2. Configure Metro Bundler

Create `mobile/metro.config.js` (already created)

### 3. Android Permissions

Verify `mobile/android/app/src/main/AndroidManifest.xml` has:
- INTERNET permission
- READ_EXTERNAL_STORAGE
- WRITE_EXTERNAL_STORAGE

### 4. iOS Permissions

Verify `mobile/ios/Info.plist` has:
- NSPhotoLibraryUsageDescription
- NSMicrophoneUsageDescription (if needed)

## 🐛 Common Issues & Fixes

### Android Build Fails

**Issue: "SDK location not found"**
```bash
# Create local.properties in mobile/android/
echo "sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk" > mobile/android/local.properties
```

**Issue: "Gradle build failed"**
```bash
cd mobile/android
./gradlew clean
cd ../..
npm run android
```

**Issue: "Unable to resolve dependency"**
```bash
cd mobile
rm -rf node_modules
npm install
```

### iOS Build Fails

**Issue: "Pod install failed"**
```bash
cd mobile/ios
rm -rf Pods Podfile.lock
pod install
```

**Issue: "Signing error"**
- Open Xcode
- Select project > Signing & Capabilities
- Select your team

**Issue: "No bundle URL"**
```bash
cd mobile
npm start -- --reset-cache
# Then rebuild
```

## 🎯 Testing Checklist

### Before Building
- [ ] All dependencies installed (`npm install`)
- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Environment variables configured
- [ ] API URL updated in `mobile/src/services/api.ts`

### Android Testing
- [ ] APK builds successfully
- [ ] App installs on device/emulator
- [ ] App launches without crashes
- [ ] Can register/login
- [ ] Can upload audio file
- [ ] Can start repair process
- [ ] Can play audio files
- [ ] Enhancement settings work

### iOS Testing
- [ ] App builds in Xcode
- [ ] Runs on simulator
- [ ] Runs on physical device
- [ ] All features work
- [ ] No crashes

## 📱 Quick Test Commands

### Android
```bash
# Clean and rebuild
cd mobile/android
./gradlew clean
cd ../..
npm run android

# Install on connected device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat | grep ReactNativeJS
```

### iOS
```bash
# Clean build
cd mobile/ios
rm -rf build
cd ../..
npm run ios

# View logs (in another terminal)
react-native log-ios
```

## 🚀 Production Build Steps

### Android
1. Update version in `build.gradle`
2. Generate signed APK
3. Test thoroughly
4. Upload to Play Store

### iOS
1. Update version in Xcode
2. Archive build
3. Test on device
4. Upload to App Store Connect

## 📝 Notes

- **Backend must be running** for app to work
- **Update API URL** for physical devices (use your computer's IP)
- **ML models** need to be installed on server (not mobile)
- **File permissions** required for file access

## 🔍 Debugging Tips

1. **Check Metro bundler** is running
2. **Check backend** is accessible from device
3. **Check logs** with `adb logcat` or Xcode console
4. **Clear cache** if issues persist: `npm start -- --reset-cache`
5. **Rebuild** after major changes

