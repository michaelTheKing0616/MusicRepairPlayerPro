# Music Repair Mobile App

React Native mobile application for the Music Repair App with Material 3 design.

## Getting Started

### Prerequisites

- Node.js 18+
- React Native development environment
  - Android Studio (for Android)
  - Xcode (for iOS, macOS only)

### Installation

```bash
# Install dependencies
npm install

# iOS only: Install CocoaPods dependencies
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Configuration

Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'  // Change this for your setup
  : 'https://your-api-domain.com/api';
```

### Network Configuration

- **Android Emulator**: Use `http://10.0.2.2:3000/api`
- **iOS Simulator**: Use `http://localhost:3000/api`
- **Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.100:3000/api`)

## Features

### Screens

- **Login/Register**: User authentication
- **Library**: Browse uploaded audio files
- **Audio Player**: Play audio files
- **Repair Upload**: Upload and repair audio files

### Libraries

- React Native Paper (Material 3 design system)
- React Navigation (Stack & Tab navigation)
- React Native Track Player (Audio playback)
- React Native Document Picker (File selection)
- Axios (HTTP client)

## Project Structure

```
src/
├── screens/        # App screens
├── navigation/     # Navigation setup
├── services/       # API services
├── components/     # Reusable components
├── theme/          # Material 3 theme
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run lint` - Run ESLint
- `npm run type-check` - Type check TypeScript

## Building

### Android

```bash
cd android
./gradlew assembleRelease
```

### iOS

```bash
cd ios
xcodebuild -workspace MusicRepairApp.xcworkspace -scheme MusicRepairApp -configuration Release
```

## Troubleshooting

### Metro bundler issues

```bash
npm start -- --reset-cache
```

### Android build issues

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS build issues

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

