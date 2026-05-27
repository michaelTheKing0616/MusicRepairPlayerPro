# Fix: "tsx is not recognized" Error

## Problem
When you run `npm run dev` in the backend folder, you get:
```
'tsx' is not recognized as an internal or external command
```

## Root Cause
The backend dependencies haven't been installed yet. The `tsx` package (which runs TypeScript files) needs to be installed first.

## Solution

### Step 1: Install Dependencies

Open PowerShell in the backend folder and run:

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\backend
npm install
```

This will install all packages including `tsx`.

### Step 2: Verify Installation

After installation completes, verify `tsx` is available:

```powershell
npm list tsx
```

### Step 3: Run Backend

Now you can run:

```powershell
npm run dev
```

## Complete Backend Setup

If this is your first time setting up the backend:

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Setup environment:**
   ```powershell
   copy env.example .env
   # Edit .env with your database credentials
   ```

3. **Generate Prisma client:**
   ```powershell
   npm run prisma:generate
   ```

4. **Run migrations:**
   ```powershell
   npm run prisma:migrate
   ```

5. **Start server:**
   ```powershell
   npm run dev
   ```

## Quick Check

To verify everything is set up:

```powershell
# Check Node.js version (need 18+)
node --version

# Check if dependencies are installed
Test-Path node_modules

# If false, run: npm install
```

## Troubleshooting

### npm install fails
- Check internet connection
- Try: `npm install --legacy-peer-deps`
- Clear npm cache: `npm cache clean --force`

### Still getting tsx error
- Make sure you're in the backend folder
- Verify node_modules exists after npm install
- Try: `npx tsx src/server.ts` directly

## That's It!

Once you run `npm install`, the error will be fixed! ✅

