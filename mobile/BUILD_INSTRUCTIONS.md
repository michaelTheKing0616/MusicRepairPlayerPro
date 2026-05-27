# Build Android APK - Step by Step Instructions

## ⚠️ IMPORTANT: Gradle Wrapper Missing

The `gradlew.bat` file is missing from the `android/` folder. **You MUST generate it first** before running `build_android.bat`.

## Quick Setup (Choose One Method)

### Method 1: Let React Native Generate It (EASIEST)

1. **Run this command:**
   ```bash
   cd C:\Users\HP\Desktop\MusicRepairApp\mobile
   npx react-native run-android
   ```

2. **Wait for it to start generating files** - you'll see it creating the Gradle wrapper

3. **You can cancel** (Ctrl+C) once you see it starting to actually build the app

4. **Verify wrapper exists:**
   ```bash
   dir android\gradlew.bat
   ```

5. **Now run the build:**
   ```bash
   .\build_android.bat
   ```

### Method 2: Use Setup Script

I've created a helper script:

```bash
cd C:\Users\HP\Desktop\MusicRepairApp\mobile
.\setup_gradle_wrapper.bat
```

This will check for the wrapper and guide you through setup.

### Method 3: Manual Gradle Wrapper Generation

If you have Gradle installed:

```bash
cd C:\Users\HP\Desktop\MusicRepairApp\mobile\android
gradle wrapper --gradle-version 8.3
cd ..
.\build_android.bat
```

## After Wrapper is Generated

Once `android\gradlew.bat` exists, simply run:

```bash
cd C:\Users\HP\Desktop\MusicRepairApp\mobile
.\build_android.bat
```

## What the Build Script Does

1. ✅ Installs npm dependencies (if needed)
2. ✅ Creates `local.properties` (if missing) - **Already exists ✓**
3. ⚠️ Cleans build with `gradlew.bat clean` - **Needs wrapper**
4. ⚠️ Builds Release APK with `gradlew.bat assembleRelease` - **Needs wrapper**
5. ✅ Falls back to Debug build if Release fails

## Expected Build Time

- **First build**: 10-20 minutes (downloads dependencies)
- **Subsequent builds**: 2-5 minutes

## Troubleshooting

### "gradlew.bat is not recognized"
**Solution**: The wrapper wasn't generated. Use Method 1 above.

### "SDK location not found"
**Solution**: Check `android\local.properties` exists - **It does ✓**

### "Java not found"
**Solution**: Install JDK 17+ from: https://adoptium.net/

### Build fails with compilation errors
**Solution**: 
```bash
cd android
gradlew.bat clean
cd ..
npm install
cd android
gradlew.bat assembleDebug
```

## Next Steps

**Right now, run this to generate the wrapper:**
```bash
cd C:\Users\HP\Desktop\MusicRepairApp\mobile
npx react-native run-android
```

**Then after wrapper is generated:**
```bash
.\build_android.bat
```

---

**Current Status**: 
- ✅ All config files ready
- ✅ Dependencies ready
- ⚠️ Gradle wrapper missing - **MUST generate first**

