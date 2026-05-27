# Backend Setup Guide

Complete guide to set up and run the MusicRepairApp backend.

## ✅ What's Been Created

The complete backend structure is now in place:

### Core Components
- ✅ FastAPI application with proper structure
- ✅ Database models (User, AudioFile, Job, TransformRequest)
- ✅ Authentication system (JWT tokens)
- ✅ API routes (auth, upload, transform, jobs)
- ✅ Storage service (MinIO/S3)
- ✅ Celery task queue setup
- ✅ Database migrations (Alembic)
- ✅ Docker configuration

### API Endpoints
- ✅ `POST /api/v1/auth/register` - User registration
- ✅ `POST /api/v1/auth/login` - User login
- ✅ `GET /api/v1/auth/me` - Current user info
- ✅ `POST /api/v1/audio/upload` - Upload audio file
- ✅ `POST /api/v1/transform` - Request transformation
- ✅ `GET /api/v1/jobs/{job_id}/status` - Job status
- ✅ `GET /api/v1/jobs/{job_id}/download` - Download result

## 🚀 Quick Start

### 1. Install Dependencies

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

**Manual:**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file:
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/musicrepair

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Security (CHANGE THIS!)
SECRET_KEY=your-random-secret-key-here
```

### 3. Start Services

**Option A: Docker Compose (Recommended)**
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO (ports 9000, 9001)
- API server (port 8000)
- Celery worker

**Option B: Manual Setup**

1. **PostgreSQL:**
   ```bash
   # Install and start PostgreSQL
   # Create database
   createdb musicrepair
   ```

2. **Redis:**
   ```bash
   redis-server
   ```

3. **MinIO:**
   ```bash
   docker run -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     minio/minio server /data --console-address ":9001"
   ```

### 4. Run Database Migrations

```bash
alembic upgrade head
```

### 5. Start API Server

```bash
uvicorn app.main:app --reload
```

API available at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### 6. Start Celery Worker

In a separate terminal:
```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── upload.py        # File upload endpoints
│   │   │   ├── transform.py     # Transformation requests
│   │   │   └── jobs.py          # Job status & download
│   │   └── __init__.py          # API router
│   ├── core/
│   │   ├── config.py            # Settings & configuration
│   │   ├── database.py          # Database connection
│   │   ├── security.py          # JWT & password hashing
│   │   └── dependencies.py      # FastAPI dependencies
│   ├── models/
│   │   ├── user.py              # User model
│   │   ├── audio_file.py        # Audio file model
│   │   ├── job.py               # Job model
│   │   └── transform_request.py # Transform request model
│   ├── schemas/
│   │   ├── auth.py              # Auth schemas
│   │   ├── audio.py             # Audio schemas
│   │   ├── job.py               # Job schemas
│   │   └── transform.py         # Transform schemas
│   ├── services/
│   │   ├── storage.py           # MinIO/S3 storage service
│   │   └── ai_processing.py     # AI model integration (placeholder)
│   ├── tasks/
│   │   ├── celery_app.py        # Celery configuration
│   │   └── transform_tasks.py   # Transform task (placeholder)
│   └── main.py                  # FastAPI application
├── alembic/                     # Database migrations
├── requirements.txt             # Python dependencies
├── docker-compose.yml           # Docker services
├── Dockerfile                   # API server image
└── .env.example                 # Environment template
```

## 🔧 Next Steps

### Immediate (To Get Running)

1. ✅ **Backend Structure** - DONE
2. ⏳ **Database Setup** - Configure PostgreSQL
3. ⏳ **Storage Setup** - Configure MinIO/S3
4. ⏳ **Test API** - Verify endpoints work

### Short Term (Next Week)

1. ⏳ **AI Model Integration** - Connect Demucs, WhisperX, etc.
2. ⏳ **Celery Task Implementation** - Complete transform processing
3. ⏳ **Error Handling** - Add comprehensive error handling
4. ⏳ **Testing** - Unit tests for key endpoints

### Medium Term (Next Month)

1. ⏳ **WebSocket Preview** - Real-time preview streaming
2. ⏳ **Model Presets** - Create voice/style presets
3. ⏳ **Performance Optimization** - Caching, batch processing
4. ⏳ **Monitoring** - Add logging and metrics

## 🧪 Testing the API

### 1. Register a User

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

### 2. Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

Save the `access_token` from response.

### 3. Upload Audio File

```bash
curl -X POST "http://localhost:8000/api/v1/audio/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@audio.wav"
```

### 4. Check API Documentation

Visit: `http://localhost:8000/docs`

Interactive API documentation with "Try it out" functionality.

## 🐛 Troubleshooting

### Database Connection Error

```
Check DATABASE_URL in .env
Ensure PostgreSQL is running
Verify database exists: createdb musicrepair
```

### Redis Connection Error

```
Check REDIS_URL in .env
Ensure Redis is running: redis-server
```

### MinIO Connection Error

```
Check MINIO_ENDPOINT in .env
Ensure MinIO is running
Access MinIO console at http://localhost:9001
```

### Import Errors

```
Ensure virtual environment is activated
Reinstall dependencies: pip install -r requirements.txt
```

## 📝 Notes

- **AI Processing**: The `ai_processing.py` service has placeholder methods. Actual model integration needs to be implemented.
- **Celery Tasks**: The transform task is a placeholder. Implement actual processing logic.
- **Storage**: Default is MinIO. To use AWS S3, set `USE_S3=True` in `.env`.
- **Security**: Change `SECRET_KEY` in production!
- **CORS**: Configure `CORS_ORIGINS` in `.env` for your frontend URLs.

## 🚀 Production Deployment

1. Set `DEBUG=False` in `.env`
2. Use strong `SECRET_KEY`
3. Configure proper database (managed PostgreSQL)
4. Use production Redis (managed service)
5. Use AWS S3 or production MinIO
6. Set up SSL/TLS (use reverse proxy like Nginx)
7. Configure proper CORS origins
8. Set up monitoring and logging
9. Use process manager (systemd, supervisor, etc.)

---

**The backend structure is complete and ready for AI model integration!** 🎉


