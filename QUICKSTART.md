# Quick Start Guide

This guide will help you get the Music Repair App up and running quickly.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Supabase account created
- [ ] React Native development environment set up
  - [ ] Android Studio (for Android development)
  - [ ] Xcode (for iOS development, macOS only)

## Step 1: Backend Setup (5 minutes)

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from env.example)
cp env.example .env

# Edit .env file with your settings:
# - DATABASE_URL: PostgreSQL connection string
# - JWT_SECRET: Generate a random string (e.g., use openssl rand -base64 32)
# - SUPABASE_URL: From your Supabase project settings
# - SUPABASE_SERVICE_ROLE_KEY: From your Supabase project settings

# Setup database
npm run prisma:generate
npm run prisma:migrate

# Start backend server
npm run dev
```

Backend should now be running on `http://localhost:3000`

## Step 2: Supabase Setup (5 minutes)

1. Go to https://supabase.com and create a project
2. In your Supabase project:
   - Go to Storage
   - Create a new bucket named `audio-files`
   - Set bucket to public (or configure access policies)
3. Copy your project URL and service role key to backend `.env` file

## Step 3: Mobile App Setup (10 minutes)

```bash
cd mobile

# Install dependencies
npm install

# iOS only: Install CocoaPods
cd ios && pod install && cd ..

# Update API URL in src/services/api.ts:
# - Development: Change to match your backend
# - For Android emulator: http://10.0.2.2:3000/api
# - For iOS simulator: http://localhost:3000/api
# - For physical device: http://YOUR_COMPUTER_IP:3000/api

# Start Metro bundler
npm start

# In a new terminal, run the app:
npm run android  # or npm run ios
```

## Step 4: Test the App

1. Open the mobile app
2. Register a new account
3. Try uploading an audio file
4. Browse your library

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL in .env is correct
- Check if port 3000 is already in use

### Database migration fails
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`

### Mobile app can't connect to backend
- Verify backend is running on port 3000
- Check API_BASE_URL in mobile/src/services/api.ts
- For Android emulator, use `10.0.2.2` instead of `localhost`
- For iOS simulator, use `localhost`
- For physical device, use your computer's IP address

### File upload fails
- Check Supabase bucket exists and is accessible
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check bucket name matches SUPABASE_STORAGE_BUCKET in .env

## Next Steps

1. Review the main README.md for detailed documentation
2. Explore the codebase structure
3. Customize the theme and styling
4. Implement ML models (currently placeholders)

## Getting Help

- Check the main README.md for detailed documentation
- Review backend/README.md for backend-specific info
- Review mobile/README.md for mobile-specific info
- Check ml/README.md for ML model implementation guide

