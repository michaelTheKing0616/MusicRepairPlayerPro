# Install Microsoft Visual C++ Build Tools

## Quick Install (Recommended)

### Method 1: Using winget (Fastest)
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

After installation completes:
1. **Restart your terminal/command prompt**
2. Run the ML installation script again

---

### Method 2: Manual Download

1. **Download Build Tools:**
   - Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Click "Download" under "Build Tools for Visual Studio 2022"

2. **Run the installer** and select:
   - ✅ **C++ build tools**
   - ✅ **Windows 10/11 SDK** (latest version)
   - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools**

3. **Click "Install"** and wait for completion

4. **Restart your terminal/command prompt**

5. **Verify installation:**
   ```cmd
   where cl.exe
   ```
   Should show path like: `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\...\bin\Hostx64\x64\cl.exe`

---

## Why You Need This

DeepFilterNet uses Rust for high-performance audio processing. On Windows, Rust needs:
- **Microsoft Visual C++ Compiler** (`cl.exe`)
- **MSVC Linker** (`link.exe`)
- **Windows SDK** (for Windows-specific libraries)

These are provided by Visual Studio Build Tools.

---

## Alternative: Use GNU Toolchain (Advanced)

If you don't want Visual Studio, you can use the GNU toolchain instead:

```cmd
rustup toolchain install stable-x86_64-pc-windows-gnu
rustup default stable-x86_64-pc-windows-gnu
rustup target add x86_64-pc-windows-gnu
```

**Note**: This may require additional setup (MinGW-w64) and is less tested.

---

## After Installation

Once Build Tools are installed:

1. **Close and reopen your terminal**
2. **Verify Rust can see the linker:**
   ```cmd
   rustc --version
   cargo build --help
   ```

3. **Re-run the ML installation:**
   ```cmd
   cd C:\Users\HP\Desktop\MusicRepairApp\ml
   install_with_msvc_check.bat
   ```

---

## File Size

The Build Tools installer is approximately **3-6 GB** depending on options selected. The actual installation will use disk space for:
- C++ compiler and tools
- Windows SDK
- MSBuild tools

---

## Troubleshooting

### "link.exe not found" still appears
- Make sure you **restarted your terminal** after installation
- Verify Build Tools are installed: Check `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\`
- Try running the installer again and ensure "C++ build tools" is checked

### Rust still can't find linker
- Check Rust is using MSVC: `rustup show`
- If it shows `gnu`, switch to MSVC: `rustup default stable-x86_64-pc-windows-msvc`
- Verify linker path: `where link.exe` (should find MSVC linker)

### Installation takes too long
- This is normal - the Build Tools are large
- Expect 10-30 minutes depending on your internet speed
- You can continue working while it installs in the background

---

## Success Indicators

After installing Build Tools and re-running the ML script, you should see:
```
Installing DeepFilterNet (with Rust and MSVC)...
Building wheel for deepfilterlib (pyproject.toml)...
✓ DeepFilterNet installed successfully!
```

---

## Quick Reference

**Install Build Tools:**
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

**Then re-run:**
```cmd
cd C:\Users\HP\Desktop\MusicRepairApp\ml
install_with_msvc_check.bat
```

That's it! 🚀

