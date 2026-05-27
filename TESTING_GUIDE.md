# Complete Testing Guide

## ✅ What's Been Done

### Backend Updates
- ✅ All API endpoints implemented
- ✅ Database models and migrations created
- ✅ Authentication system complete
- ✅ Test users seed script created
- ✅ CORS configured for mobile app
- ✅ Complete test script created

### Mobile App Updates
- ✅ API base URL updated to port 8000
- ✅ API path updated to `/api/v1`
- ✅ Authentication flow updated
- ✅ Upload endpoint updated
- ✅ Transform service connected

## 🚀 Testing Steps

### Step 1: Start Backend

**Option A: Automated (Recommended)**

Windows:
```bash
cd backend
start_backend.bat
```

Linux/Mac:
```bash
cd backend
chmod +x start_dev.sh
./start_dev.sh
```

**Option B: Manual**

```bash
cd backend

# 1. Start services
docker-compose up -d db redis minio

# 2. Setup database
alembic upgrade head
python scripts/seed_db.py

# 3. Start API server
uvicorn app.main:app --reload
```

### Step 2: Verify Backend is Running

Open a new terminal:

```bash
cd backend
python scripts/test_complete_api.py
```

You should see:
```
✅ API is healthy
✅ Login successful
✅ User info retrieved
✅ All endpoints accessible
```

Or test manually:
```bash
curl http://localhost:8000/health
```

### Step 3: Test Login from Command Line

```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Save the access_token from response, then:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/auth/me
```

### Step 4: Start Mobile App

```bash
cd mobile

# Install dependencies (if not done)
npm install

# Start Metro bundler
npm start

# In another terminal, run app
npm run android  # or npm run ios
```

### Step 5: Test Mobile App Connection

1. **Login Test**
   - Open app on device/emulator
   - Go to Login screen
   - Use credentials:
     - Email: `admin@test.com`
     - Password: `admin123`
   - Should successfully login

2. **Upload Test**
   - After login, go to Repair/Upload screen
   - Select an audio file
   - Upload should work
   - Check backend logs for confirmation

3. **Transform Test**
   - After upload, try transformation
   - Job should be created
   - Status should update

## 🔍 Verification Checklist

### Backend Verification

- [ ] API server starts without errors
- [ ] Health endpoint returns 200: `curl http://localhost:8000/health`
- [ ] API docs accessible: `http://localhost:8000/docs`
- [ ] Login works: `python scripts/test_complete_api.py`
- [ ] Database has test users: `python scripts/seed_db.py`
- [ ] Celery worker running (for job processing)

### Mobile App Verification

- [ ] App starts without errors
- [ ] Can connect to backend (check network tab)
- [ ] Login works with test credentials
- [ ] User info loads after login
- [ ] Upload screen accessible
- [ ] File picker works
- [ ] Upload progress shows
- [ ] Transform options visible

### Integration Verification

- [ ] Mobile app can reach backend API
- [ ] Authentication tokens are stored
- [ ] Upload creates job in database
- [ ] Transform request is queued
- [ ] Job status updates work
- [ ] Download endpoint accessible

## 🐛 Common Issues & Fixes

### Issue: Cannot Connect to Backend

**Symptoms**: Mobile app shows network error

**Solutions**:
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check IP address (for physical devices):
   - Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Update mobile app API URL to use your IP
3. Check firewall allows port 8000
4. Verify same network (for physical devices)

### Issue: CORS Errors

**Symptoms**: Browser/network shows CORS error

**Solutions**:
1. Backend CORS is configured to allow all in dev
2. If still issues, check `app/core/config.py` CORS_ORIGINS
3. Restart backend after config changes

### Issue: 401 Unauthorized

**Symptoms**: Requests return 401 error

**Solutions**:
1. Check token is stored: `AsyncStorage.getItem('auth_token')`
2. Try logging in again
3. Verify token format in request headers
4. Check backend logs for auth errors

### Issue: Upload Fails

**Symptoms**: File upload returns error

**Solutions**:
1. Check file size (max 500MB)
2. Verify file format (WAV, MP3, FLAC, etc.)
3. Check user has consent_audio_processing = true
4. Verify backend storage is accessible (MinIO/S3)

### Issue: Transform Job Stuck

**Symptoms**: Job status stays "queued" or "processing"

**Solutions**:
1. Check Celery worker is running: `celery -A app.tasks.celery_app worker`
2. Check worker logs for errors
3. Verify models are installed (if processing)
4. Check job queue: Redis should be running

## 📊 Expected API Responses

### Login Response
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Upload Response
```json
{
  "job_id": "uuid",
  "status": "uploaded",
  "file_info": {
    "id": "uuid",
    "filename": "audio.wav",
    "file_size": 12345,
    "duration": 180.5,
    "sample_rate": 44100,
    "channels": 2
  },
  "upload_url": "/api/v1/audio/uploads/uuid",
  "chunk_size": 5242880,
  "resume_url": "/api/v1/audio/uploads/uuid/resume"
}
```

### Job Status Response
```json
{
  "job_id": "uuid",
  "status": "processing",
  "progress": {
    "percent_complete": 65,
    "stage": "voice_conversion",
    "current_operation": "Neural vocoder synthesis"
  }
}
```

## 🎯 Quick Test Script

Save this as `test_quick.sh` (Linux/Mac) or `test_quick.bat` (Windows):

```bash
#!/bin/bash
# Quick test script

echo "Testing Backend API..."

# Test health
echo "1. Health check..."
curl -s http://localhost:8000/health && echo " ✅" || echo " ❌"

# Test login
echo "2. Login test..."
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo " ✅ Login successful"
  
  # Test get user
  echo "3. Get user test..."
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/auth/me \
    | grep -q "email" && echo " ✅ User retrieved" || echo " ❌"
else
  echo " ❌ Login failed"
fi

echo "Done!"
```

## 📝 Test Credentials

**For Mobile App Testing:**
- Email: `admin@test.com`
- Password: `admin123`

**All credentials are in `backend/TEST_CREDENTIALS.md`**

## 🔄 Next Steps After Testing

1. **If everything works:**
   - Test full upload → transform → download flow
   - Test with different file types
   - Test error scenarios

2. **If issues found:**
   - Check backend logs
   - Check mobile app console
   - Verify network connectivity
   - Check database state

3. **Production readiness:**
   - Remove test users script
   - Set strong SECRET_KEY
   - Configure production database
   - Setup monitoring

---

**Ready to test! Follow the steps above and check off items as you go.** ✅

