# MusicRepairApp Backend API

FastAPI backend for the MusicRepairApp - AI-powered audio transformation platform.

## Features

- **Authentication**: JWT-based user authentication
- **File Upload**: Resumable chunked uploads for large audio files
- **AI Transformation**: Voice conversion, style transfer, stem separation
- **Job Queue**: Celery-based async processing
- **Storage**: MinIO/S3 integration for audio file storage

## Tech Stack

- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (async with SQLAlchemy)
- **Job Queue**: Celery + Redis
- **Storage**: MinIO (default) or AWS S3
- **AI Models**: Demucs, WhisperX, FreeVC, HiFi-GAN

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Redis
- MinIO (or AWS S3)

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start Redis (if not running)
redis-server

# Start MinIO (if not running)
docker run -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"

# Start Celery worker (in separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info

# Start API server
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

## Project Structure

```
backend/
├── app/
│   ├── api/              # API routes
│   │   └── routes/       # Route handlers
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings
│   │   ├── database.py   # DB connection
│   │   ├── security.py   # Auth utilities
│   │   └── dependencies.py
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   │   ├── storage.py    # Storage service
│   │   └── ai_processing.py
│   ├── tasks/            # Celery tasks
│   └── main.py           # FastAPI app
├── alembic/              # Database migrations
├── requirements.txt
└── .env.example
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `GET /api/v1/auth/me` - Get current user info

### Audio Upload
- `POST /api/v1/audio/upload` - Upload audio file
- `POST /api/v1/audio/uploads/{file_id}/chunk` - Upload chunk (resumable)

### Transformation
- `POST /api/v1/transform` - Request transformation

### Jobs
- `GET /api/v1/jobs/{job_id}/status` - Get job status
- `GET /api/v1/jobs/{job_id}/download` - Download result

## Development

### Running Tests

```bash
pytest
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Formatting

```bash
black app/
ruff check app/
```

## Docker Deployment

```bash
# Build image
docker build -t musicrepair-api .

# Run container
docker run -p 8000:8000 --env-file .env musicrepair-api
```

## Environment Variables

See `.env.example` for all available configuration options.

Key settings:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection
- `MINIO_ENDPOINT` - MinIO server endpoint
- `SECRET_KEY` - JWT secret key (change in production!)

## License

MIT
