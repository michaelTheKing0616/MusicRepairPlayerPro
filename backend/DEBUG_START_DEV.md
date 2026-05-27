# start_dev.bat Debug Guide

## Current Status
The `start_dev.bat` script is configured and should work correctly after the fixes applied.

## Common Issues & Solutions

### Issue 1: "Python not found"
**Solution:**
- Ensure Python 3.8+ is installed
- Add Python to PATH
- Verify: `python --version`

### Issue 2: "venv not activating"
**Solution:**
- Script uses explicit paths: `venv\Scripts\python.exe`
- Should work even if activation doesn't persist

### Issue 3: "Dependencies install failed"
**Solution:**
- Check internet connection
- Try: `pip install --upgrade pip`
- Check `requirements.txt` for version conflicts

### Issue 4: "Database connection failed"
**Solution:**
- Ensure PostgreSQL is running (if using Docker: `docker-compose up -d`)
- Check `.env` file has correct DATABASE_URL
- Script continues anyway (warnings only)

### Issue 5: "Alembic/uvicorn not found"
**Solution:**
- Dependencies didn't install correctly
- Run manually: `venv\Scripts\python.exe -m pip install -r requirements.txt`

## Script Flow
1. Creates venv if missing
2. Activates venv
3. Installs dependencies (if missing)
4. Creates .env if missing
5. Runs migrations (with warning on fail)
6. Seeds database (with warning on fail)
7. Starts uvicorn server

## Manual Testing Steps

### Test Virtual Environment
```bash
cd C:\Users\HP\Desktop\MusicRepairApp\backend
python -m venv venv
venv\Scripts\python.exe --version
```

### Test Dependencies
```bash
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Test Server Start
```bash
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Debug Mode

To see more output, run commands manually:
```bash
cd C:\Users\HP\Desktop\MusicRepairApp\backend
call venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload --log-level debug
```

## Logs Location
- Server logs: Console output
- Error logs: Check terminal output
- Database logs: Check PostgreSQL logs (if running)

## Quick Fixes

### Reset Everything
```bash
cd C:\Users\HP\Desktop\MusicRepairApp\backend
rmdir /s /q venv
python -m venv venv
.\start_dev.bat
```

### Skip Database Operations
Comment out these lines in start_dev.bat:
- `call venv\Scripts\python.exe -m alembic upgrade head`
- `call venv\Scripts\python.exe scripts\seed_db.py`

### Check What's Running
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <pid> /F
```

