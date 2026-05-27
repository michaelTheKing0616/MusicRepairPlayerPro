# Music Repair App

A full-stack mobile music repair application with AI-powered audio enhancement capabilities. Built with React Native (TypeScript), Node.js, PostgreSQL, Prisma, and Supabase.

## Features

- 🎵 **Audio Player**: Play and manage your audio files
- 📚 **Library**: Browse and organize your audio collection
- 🔧 **Audio Repair**: Upload and repair audio files using AI models
- 👤 **User Authentication**: Secure user registration and login
- ☁️ **Cloud Storage**: Supabase integration for audio file storage
- 🤖 **ML Models**: Placeholder structure for DeepFilterNet, Demucs, and UVR models

## Tech Stack

### Frontend
- React Native 0.73
- TypeScript
- React Navigation
- React Native Paper (Material 3)
- React Native Track Player

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL

### Storage & Services
- Supabase (File Storage)
- JWT Authentication

### ML (Placeholders)
- DeepFilterNet
- Demucs
- UVR

## Project Structure

```
MusicRepairApp/
├── mobile/              # React Native frontend
│   ├── src/
│   │   ├── screens/     # App screens
│   │   ├── navigation/  # Navigation setup
│   │   ├── services/    # API services
│   │   ├── components/  # Reusable components
│   │   ├── theme/       # Material 3 theme
│   │   └── types/       # TypeScript types
│   └── package.json
│
├── backend/             # Node.js backend
│   ├── src/
│   │   ├── controllers/ # Route controllers
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Express middleware
│   │   ├── config/      # Configuration files
│   │   └── server.ts    # Server entry point
│   ├── prisma/          # Prisma schema
│   └── package.json
│
└── ml/                  # ML models (placeholders)
    ├── deepfilternet/   # DeepFilterNet model
    ├── demucs/          # Demucs model
    ├── uvr/             # UVR model
    └── utils/           # Shared utilities
```

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- React Native development environment set up
  - Android Studio (for Android)
  - Xcode (for iOS, macOS only)
- Supabase account and project

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd MusicRepairApp
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (generate a secure random string)
# - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# iOS only: Install pods
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### 4. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Create a storage bucket named `audio-files` (or update `SUPABASE_STORAGE_BUCKET` in backend `.env`)
3. Set bucket to public or configure proper access policies
4. Copy your project URL and service role key to backend `.env`

### 5. ML Setup (Placeholder)

The ML models are currently placeholders. To prepare for implementation:

```bash
cd ml

# Install Python dependencies (when implemented)
pip install -r requirements.txt
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/musicrepair"
JWT_SECRET="your-secret-key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="audio-files"
PORT=3000
NODE_ENV=development
```

### Mobile

Update `API_BASE_URL` in `mobile/src/services/api.ts` to match your backend URL:

- Development: `http://localhost:3000/api`
- Production: `https://your-api-domain.com/api`

For Android emulator, use `http://10.0.2.2:3000/api`
For iOS simulator, use `http://localhost:3000/api`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Audio Files
- `POST /api/audio/upload` - Upload audio file
- `GET /api/audio/files` - Get all audio files
- `GET /api/audio/files/:id` - Get audio file by ID
- `DELETE /api/audio/files/:id` - Delete audio file

### Audio Repair
- `POST /api/audio/repair` - Create repair request
- `GET /api/audio/repair` - Get repair requests
- `GET /api/audio/repair/:id` - Get repair request by ID

## Development

### Backend

```bash
cd backend

# Development with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Prisma Studio (database GUI)
npm run prisma:studio
```

### Mobile

```bash
cd mobile

# Start Metro bundler
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Database Schema

The Prisma schema includes:

- **User**: User accounts
- **AudioFile**: Uploaded audio files
- **AudioRepairRequest**: Audio repair job requests

See `backend/prisma/schema.prisma` for full schema details.

## ML Models (Status: Placeholders)

The ML folder contains placeholder implementations for:

- **DeepFilterNet**: Real-time speech enhancement and noise reduction
- **Demucs**: Source separation and audio demixing
- **UVR**: Vocal removal and isolation

These are placeholders only. Implementation is pending.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

