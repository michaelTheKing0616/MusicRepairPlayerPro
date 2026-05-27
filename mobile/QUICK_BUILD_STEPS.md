# Quick Build Steps

## Step 1: Install Missing Dependency
```bash
cd C:\Users\HP\Desktop\MusicRepairApp\mobile
npm install
```

This will install `@react-native-community/cli` that was added to package.json.

## Step 2: Generate Gradle Wrapper (if missing)
If `android\gradlew.bat` doesn't exist, run:
```bash
npx react-native run-android
```
This will generate missing Android build files. You can cancel it once it starts building.

OR manually in android folder:
```bash
cd android
gradle wrapper --gradle-version 8.3
```

## Step 3: Build APK
```bash
.\build_android.bat
```

## Alternative: One-Command Script
I've created `install_and_build.bat` that attempts all steps:
```bash
.\install_and_build.bat
```

## If Gradle Wrapper is Missing

The easiest way to get it is to let React Native generate it:
```bash
npx react-native run-android
```

This command will:
1. Generate gradlew.bat
2. Generate gradle-wrapper.jar
3. Set up all missing Android files
4. Try to build (you can stop it after wrapper is generated)

Then run:
```bash
.\build_android.bat
```

## Troubleshooting

### "gradlew.bat not found"
**Solution:** Run `npx react-native run-android` once to generate it.

### "SDK location not found"
**Solution:** Ensure `android\local.properties` exists with:
```
sdk.dir=C:\\Users\\HP\\AppData\\Local\\Android\\Sdk
```

### "Java not found"
**Solution:** Install JDK 17+ and add to PATH.

### Build fails with native module errors
**Solution:** 
```bash
cd android
gradlew.bat clean
cd ..
npm install
cd android
gradlew.bat assembleDebug
```

