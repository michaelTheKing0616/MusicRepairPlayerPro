# Quick Start Guide

Get the backend running in 5 minutes!

## 🚀 Step 1: Setup Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 🗄️ Step 2: Start Services

### Option A: Docker Compose (Easiest)

```bash
# Start PostgreSQL, Redis, and MinIO
docker-compose up -d db redis minio
```

### Option B: Manual Setup

1. **PostgreSQL**: Install and start PostgreSQL
2. **Redis**: `redis-server` or install Redis
3. **MinIO**: `docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"`

## ⚙️ Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your database credentials
# At minimum, update:
# - DATABASE_URL
# - SECRET_KEY (change to random string!)
```

## 📦 Step 4: Setup Database

```bash
# Run migrations
alembic upgrade head

# Seed test users
python scripts/seed_db.py
```

You should see:
```
✅ Created user: admin@test.com (Password: admin123)
✅ Created user: user@test.com (Password: user123)
✅ Created user: premium@test.com (Password: premium123)
✅ Database seeded successfully!
```

## 🎯 Step 5: Start API Server

```bash
# Start FastAPI server
uvicorn app.main:app --reload
```

API will be available at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

## 🔧 Step 6: Start Celery Worker (Optional)

In a separate terminal:

```bash
# Activate venv again
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info
```

## 🧪 Step 7: Test the API

### Quick Test Script

```bash
python scripts/test_api.py
```

### Manual Testing

```bash
# 1. Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Save the access_token from response

# 2. Get user info
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/auth/me

# 3. Check API docs
# Open browser: http://localhost:8000/docs
```

## 📝 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@test.com` | `admin123` |
| User | `user@test.com` | `user123` |
| Premium | `premium@test.com` | `premium123` |

See `TEST_CREDENTIALS.md` for full details.

## ✅ Verify Everything Works

1. ✅ API server running (check `http://localhost:8000/health`)
2. ✅ Database seeded (check with `python scripts/test_api.py`)
3. ✅ Can login (test with curl or test script)
4. ✅ API docs accessible (`http://localhost:8000/docs`)

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
# Try: psql -U user -d musicrepair
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### MinIO Connection Error
```bash
# Check MinIO is running
curl http://localhost:9000/minio/health/live
# Or open: http://localhost:9001 (console)
```

### Port Already in Use
```bash
# Change port in uvicorn command
uvicorn app.main:app --port 8001 --reload
# Update .env if needed
```

## 🎉 Next Steps

Once everything is running:

1. **Test Upload**: Try uploading an audio file via API
2. **Test Transform**: Request a transformation job
3. **Check Job Status**: Monitor job progress
4. **Connect Mobile App**: Update mobile app API URL

## 📚 Documentation

- `BACKEND_SETUP_GUIDE.md` - Detailed setup instructions
- `TEST_CREDENTIALS.md` - Test user accounts
- `IMPLEMENTATION_STATUS.md` - Current implementation status
- API Docs: `http://localhost:8000/docs` (when server is running)

---

**That's it! Your backend should be running. 🚀**

