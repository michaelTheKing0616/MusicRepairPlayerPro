# Backend Setup Fix - "tsx is not recognized"

## Problem

When running `npm run dev`, you get:
```
'tsx' is not recognized as an internal or external command
```

## Solution

This means the backend dependencies haven't been installed yet.

### Quick Fix

**Option 1: Run the install script**
```bash
cd backend
install_dependencies.bat
```

**Option 2: Manual installation**
```bash
cd backend
npm install
```

### After Installation

1. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

2. **Setup Environment:**
   ```bash
   copy env.example .env
   # Then edit .env with your database and Supabase credentials
   ```

3. **Run Database Migrations:**
   ```bash
   npm run prisma:migrate
   ```

4. **Start Backend:**
   ```bash
   npm run dev
   ```

## Complete Setup Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma client generated (`npm run prisma:generate`)
- [ ] Environment file configured (`.env`)
- [ ] Database migrations run (`npm run prisma:migrate`)
- [ ] Backend server starts (`npm run dev`)

## Troubleshooting

### "npm is not recognized"
- Install Node.js from https://nodejs.org/
- Make sure to check "Add to PATH" during installation

### "npm install fails"
- Check internet connection
- Try: `npm install --legacy-peer-deps`
- Clear cache: `npm cache clean --force`

### "Prisma errors"
- Make sure PostgreSQL is running
- Check `.env` database connection string
- Run: `npm run prisma:generate`

### Backend starts but can't connect
- Check port 3000 is available
- Verify `.env` configuration
- Check database is accessible

## Quick Start Script

I've created `install_dependencies.bat` that will:
1. Check Node.js is installed
2. Install all npm packages
3. Show next steps

Just run it and follow the prompts!

