# How to Run PowerShell Scripts - Execution Policy Fix

## The Problem

PowerShell scripts are blocked by execution policy, causing them to close immediately.

## Solutions

### Option 1: Run Script with Bypass (Recommended) ⭐

Instead of double-clicking, run from PowerShell:

```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml
powershell -ExecutionPolicy Bypass -File install_ml_fixed.ps1
```

This bypasses the execution policy for this one script only.

### Option 2: Use Batch File (Easiest)

The `.bat` file doesn't have execution policy issues:

```cmd
cd C:\Users\HP\Desktop\MusicRepairApp\ml
install_ml.bat
```

**OR**

Just double-click `install_ml.bat` - it will work!

### Option 3: Change Execution Policy (Permanent)

If you want to run PowerShell scripts normally:

```powershell
# Run as Administrator
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then you can run scripts normally.

## Recommended: Use the Batch File

The easiest solution is to use `install_ml.bat`:
- ✅ No execution policy issues
- ✅ Works by double-clicking
- ✅ Same functionality

## Quick Start

**For ML Models:**
```cmd
cd C:\Users\HP\Desktop\MusicRepairApp\ml
install_ml.bat
```

**Or PowerShell (with bypass):**
```powershell
cd C:\Users\HP\Desktop\MusicRepairApp\ml
powershell -ExecutionPolicy Bypass -File install_ml_fixed.ps1
```

## Summary

✅ **Use `install_ml.bat`** - No execution policy issues!
✅ **Or run PowerShell with bypass** - One command
✅ **Mobile packages fixed** - Ready to install

