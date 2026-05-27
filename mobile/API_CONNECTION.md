# Mobile App API Connection Guide

## ✅ Updates Made

The mobile app has been updated to connect to the FastAPI backend.

### Changes

1. **API Base URL Updated**
   - Changed from port `3000` to `8000` (FastAPI default)
   - Updated path from `/api` to `/api/v1`
   - Android: `http://10.0.2.2:8000/api/v1`
   - iOS: `http://localhost:8000/api/v1`

2. **Authentication Updated**
   - Login now uses `access_token` from backend
   - Registration flow updated
   - Token storage compatible

3. **Upload Endpoint Updated**
   - Matches backend `/audio/upload` endpoint
   - Handles `UploadResponse` format
   - Converts to app's `AudioFile` format

## 🔌 Connection Steps

### 1. Start Backend

```bash
cd backend

# Option A: Use startup script (Windows)
start_backend.bat

# Option B: Use startup script (Linux/Mac)
chmod +x start_dev.sh
./start_dev.sh

# Option C: Manual
# Start services
docker-compose up -d db redis minio

# Start API
uvicorn app.main:app --reload
```

### 2. Verify Backend is Running

```bash
# Test API
python backend/scripts/test_complete_api.py

# Or manually
curl http://localhost:8000/health
```

### 3. Update Mobile App Configuration

The API URLs are already configured in:
- `mobile/src/services/api.ts`
- `mobile/src/services/audioTransformService.ts`

For physical devices, you may need to update the IP address:

```typescript
// In api.ts or audioTransformService.ts
// Find your computer's IP address:
// Windows: ipconfig
// Mac/Linux: ifconfig

// For physical device testing:
const API_BASE_URL = 'http://YOUR_COMPUTER_IP:8000/api/v1';
// Example: 'http://192.168.1.100:8000/api/v1'
```

### 4. Test Connection from Mobile App

#### Android Emulator

The app is already configured to use `http://10.0.2.2:8000/api/v1` which maps to `localhost:8000` on your computer.

#### iOS Simulator

The app is already configured to use `http://localhost:8000/api/v1`.

#### Physical Device

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   
   # Mac/Linux
   ifconfig
   # Look for inet address (e.g., 192.168.1.100)
   ```

2. Update API URL in mobile app:
   ```typescript
   // mobile/src/services/api.ts
   const getApiUrl = () => {
     if (__DEV__) {
       if (Platform.OS === 'android') {
         // Use your computer's IP
         return 'http://192.168.1.100:8000/api/v1';
       }
       return 'http://192.168.1.100:8000/api/v1';
     }
     return 'https://your-api-domain.com/api/v1';
   };
   ```

3. Make sure your computer and phone are on the same WiFi network
4. Make sure firewall allows connections on port 8000

## 🧪 Testing the Connection

### Test Login

The mobile app should be able to login with test credentials:

```
Email: admin@test.com
Password: admin123
```

### Test Upload

1. Select an audio file in the app
2. Upload should work and return a job_id
3. Check backend logs for upload confirmation

### Test Transform

1. After uploading, request a transformation
2. Job should be created and queued
3. Check job status endpoint

## 🔍 Troubleshooting

### Connection Refused

**Problem**: Cannot connect to API

**Solutions**:
- Verify backend is running: `curl http://localhost:8000/health`
- Check firewall allows port 8000
- Verify IP address is correct (for physical devices)
- Make sure device and computer are on same network

### CORS Errors

**Problem**: CORS error in mobile app

**Solution**: Update backend CORS settings in `app/core/config.py`:
```python
CORS_ORIGINS: list = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://10.0.2.2:3000",
    # Add your mobile app's origin if needed
]
```

### Authentication Errors

**Problem**: 401 Unauthorized

**Solutions**:
- Check token is being stored: `AsyncStorage.getItem('auth_token')`
- Verify login was successful
- Check token format in request headers
- Try logging in again

### Upload Fails

**Problem**: Upload returns error

**Solutions**:
- Check file size (max 500MB)
- Verify file format is allowed (WAV, MP3, FLAC, etc.)
- Check user has consent_audio_processing = true
- Check backend logs for detailed error

## 📱 Mobile App Testing Checklist

- [ ] App can connect to backend (check network tab)
- [ ] Login works with test credentials
- [ ] User info is retrieved after login
- [ ] Audio file can be uploaded
- [ ] Upload progress is shown
- [ ] Transform request can be created
- [ ] Job status can be polled
- [ ] Results can be downloaded

## 🔗 API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/register` | POST | Register new user |
| `/api/v1/auth/login` | POST | Login and get token |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/audio/upload` | POST | Upload audio file |
| `/api/v1/transform` | POST | Request transformation |
| `/api/v1/jobs/{id}/status` | GET | Get job status |
| `/api/v1/jobs/{id}/download` | GET | Download result |

## 📝 Next Steps

1. **Test Backend**: Run `python backend/scripts/test_complete_api.py`
2. **Start Backend**: Use `start_backend.bat` or `start_dev.sh`
3. **Run Mobile App**: `npm start` then `npm run android` or `npm run ios`
4. **Test Login**: Use `admin@test.com` / `admin123`
5. **Test Upload**: Upload a test audio file
6. **Test Transform**: Request a transformation

---

**The mobile app is now configured to connect to the FastAPI backend!** 🎉

