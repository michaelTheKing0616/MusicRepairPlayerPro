# Quick Fix: Backend "tsx is not recognized" Error

## The Problem

You're seeing:
```
'tsx' is not recognized as an internal or external command
```

**This means:** Backend dependencies haven't been installed yet!

## The Fix

Run this in PowerShell:

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\backend
npm install
```

This will install all dependencies including `tsx`.

## After Installation

Then you can run:
```powershell
npm run dev
```

## Complete Setup Steps

1. **Install dependencies:**
   ```powershell
   cd C:\Users\HP\Desktop\MusicRepairApp\backend
   npm install
   ```

2. **Setup environment file:**
   ```powershell
   copy env.example .env
   # Edit .env with your settings
   ```

3. **Generate Prisma client:**
   ```powershell
   npm run prisma:generate
   ```

4. **Run database migrations:**
   ```powershell
   npm run prisma:migrate
   ```

5. **Start backend:**
   ```powershell
   npm run dev
   ```

## Alternative: Use the Install Script

I've created `backend\install_dependencies.bat` - just double-click it!

## Troubleshooting

### If npm install fails:
- Check internet connection
- Try: `npm install --legacy-peer-deps`
- Clear cache: `npm cache clean --force`

### If Prisma errors:
- Make sure PostgreSQL is installed and running
- Check your `.env` database connection string
- Ensure database exists

## That's It!

Once dependencies are installed, `npm run dev` will work! 🚀

