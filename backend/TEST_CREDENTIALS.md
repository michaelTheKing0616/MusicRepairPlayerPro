# Test Credentials

Hard-coded test users for development and testing.

## 🔐 Test User Accounts

### 1. Admin User (Premium)
- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Name**: Admin User
- **Premium**: ✅ Yes
- **Features**: All enabled
- **Voice Cloning**: ✅ Enabled
- **Age Verified**: ✅ Yes

### 2. Regular User
- **Email**: `user@test.com`
- **Password**: `user123`
- **Name**: Test User
- **Premium**: ❌ No
- **Features**: Basic features only
- **Voice Cloning**: ❌ Disabled
- **Age Verified**: ✅ Yes

### 3. Premium User
- **Email**: `premium@test.com`
- **Password**: `premium123`
- **Name**: Premium User
- **Premium**: ✅ Yes
- **Features**: All enabled
- **Voice Cloning**: ✅ Enabled
- **Age Verified**: ✅ Yes
- **Model Training**: ✅ Enabled

## 🚀 Quick Start

### 1. Seed Database

```bash
# Make sure database is running
# Run seed script
python scripts/seed_db.py
```

This will create all test users in the database.

### 2. Test Login

```bash
# Using curl
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Or use the test script
python scripts/test_api.py
```

### 3. Use Token

```bash
# Save token from login response
export TOKEN="your-access-token-here"

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/auth/me
```

## 📝 API Testing Examples

### Register (optional - users already exist)
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "password123",
    "name": "New User"
  }'
```

### Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

### Get Current User
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/auth/me
```

### Upload Audio File
```bash
curl -X POST "http://localhost:8000/api/v1/audio/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@audio.wav"
```

### Request Transformation
```bash
curl -X POST "http://localhost:8000/api/v1/transform" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "JOB_UUID_HERE",
    "transform_type": "voice",
    "params": {
      "voice_preset": "preset_male_baritone_001",
      "intensity": 0.85,
      "preserve_pitch": true
    },
    "options": {
      "separate_stems": true,
      "extract_content": false,
      "quality": "high"
    }
  }'
```

### Check Job Status
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/jobs/JOB_UUID_HERE/status
```

## 🔄 Reset Database

To reset and re-seed the database:

```bash
# Drop all tables (careful!)
alembic downgrade base

# Recreate tables
alembic upgrade head

# Seed with test users
python scripts/seed_db.py
```

## ⚠️ Security Note

**These credentials are for DEVELOPMENT ONLY!**

Do NOT use these in production. In production:
1. Remove seed script or secure it
2. Use proper user registration
3. Enforce strong password policies
4. Enable 2FA for admin accounts

## 🧪 Automated Testing

Use the test script for quick validation:

```bash
python scripts/test_api.py
```

This will:
- Check API health
- Test login for all users
- Test user info retrieval
- Display tokens for further testing

