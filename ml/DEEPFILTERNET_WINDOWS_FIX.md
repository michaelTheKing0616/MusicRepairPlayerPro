# DeepFilterNet Installation Fix for Windows

## Problem

The installation failed with:
```
error: linker `link.exe` not found
note: the msvc targets depend on the msvc linker but `link.exe` was not found
note: please ensure that Visual Studio 2017 or later, or Build Tools for Visual Studio were installed with the Visual C++ option.
```

**Cause**: DeepFilterNet requires Rust compilation, which needs Microsoft Visual C++ Build Tools on Windows.

---

## ✅ Solution Options

### Option 1: Install Visual Studio Build Tools (Recommended)

**Quick Install via winget:**
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

Or download manually:
1. Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Download "Build Tools for Visual Studio 2022"
3. Run installer and select:
   - ✅ **C++ build tools**
   - ✅ **Windows 10/11 SDK**
   - ✅ **MSVC v143 compiler toolset**

**After installation:**
1. Restart your terminal/command prompt
2. Run the installation script again:
   ```cmd
   cd C:\Users\HP\Desktop\MusicRepairApp\ml
   install_ml.bat
   ```

---

### Option 2: Use GNU Toolchain (Alternative)

If you prefer not to install Visual Studio, you can switch Rust to use the GNU toolchain:

```cmd
rustup toolchain install stable-x86_64-pc-windows-gnu
rustup default stable-x86_64-pc-windows-gnu
rustup target add x86_64-pc-windows-gnu
```

**Note**: This may require additional setup and is less common on Windows.

---

### Option 3: Skip DeepFilterNet (Temporary Workaround)

If you want to proceed without DeepFilterNet for now:

1. Use the skip script:
   ```cmd
   install_skip_deepfilternet.bat
   ```

2. Or manually install everything except DeepFilterNet:
   ```cmd
   python -m pip install torch torchaudio numpy scipy
   python -m pip install librosa soundfile
   python -m pip install demucs
   python -m pip install pyloudnorm supabase tqdm python-dotenv
   ```

The audio repair pipeline will use fallback denoising methods when DeepFilterNet is not available.

---

## Verification

After installing Visual Studio Build Tools, verify Rust can find the linker:

```cmd
rustc --version
cargo --version
```

Then try building a simple Rust project to test:
```cmd
cargo new test_project
cd test_project
cargo build
```

If this works, DeepFilterNet installation should succeed.

---

## Why This Happened

- DeepFilterNet uses Rust for performance-critical audio processing
- Rust on Windows defaults to the MSVC toolchain
- The MSVC toolchain requires Visual Studio Build Tools
- Without the linker, Rust cannot compile native code

---

## Quick Fix Command

**One-liner to install Build Tools:**
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --silent --accept-source-agreements --accept-package-agreements
```

Then restart terminal and re-run `install_ml.bat`.

---

## Current Status

✅ **Installed Successfully:**
- PyTorch
- librosa
- Demucs
- pyloudnorm

❌ **Failed:**
- DeepFilterNet (requires MSVC linker)

**Note**: The verification showing "✓ DeepFilterNet" might be a false positive. The package likely didn't install correctly despite the message.

---

## Recommended Action

1. Install Visual Studio Build Tools (Option 1)
2. Restart terminal
3. Re-run `install_ml.bat`
4. DeepFilterNet should install successfully

**Or** proceed without DeepFilterNet using the fallback denoising methods in the pipeline.

