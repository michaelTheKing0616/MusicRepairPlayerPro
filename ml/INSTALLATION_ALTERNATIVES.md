# ML Models Installation - Alternative Approaches

## Current Issue

DeepFilterNet requires Rust/Cargo to compile, which is causing installation errors.

## Solutions

### Option 1: Install Rust (Best Quality) ⭐

**Windows:**
```powershell
# Download and run: https://rustup.rs/
# Or via winget:
winget install Rustlang.Rustup

# After installation, restart terminal and:
cd ml
pip install -r requirements.txt
```

**Pros:**
- Full DeepFilterNet functionality
- Best audio quality
- Production-ready

**Cons:**
- Requires Rust installation (~100MB)
- Takes longer to install

### Option 2: Use Fallback Implementation (Quickest) ⚡

Skip DeepFilterNet installation entirely:

```bash
cd ml
pip install torch torchaudio numpy scipy librosa soundfile demucs pyloudnorm supabase tqdm python-dotenv
```

**Pros:**
- Works immediately
- No Rust required
- Good enough for testing

**Cons:**
- Lower quality denoising
- Uses spectral subtraction (basic)

**How it works:**
The code in `deepfilternet/model.py` already has a fallback implementation that uses scipy for basic noise reduction. It will work without the full DeepFilterNet model.

### Option 3: Use Pre-compiled Wheels

Try installing DeepFilterNet with pre-built binaries:

```bash
pip install deepfilternet --only-binary :all:
```

### Option 4: Alternative Noise Reduction Library

Replace DeepFilterNet with `noisereduce`:

```bash
pip install noisereduce
```

Then update `deepfilternet/model.py` to use it instead.

## Recommended Approach

**For Testing Now:**
1. Use Option 2 (fallback) - works immediately
2. Test all features
3. Install Rust + DeepFilterNet later for production

**For Production:**
1. Install Rust
2. Install full DeepFilterNet
3. Get best quality results

## Quick Test Without Full Installation

You can test the entire app with fallback implementations:

```bash
cd ml
# Skip DeepFilterNet, install rest
pip install torch torchaudio numpy scipy librosa soundfile demucs pyloudnorm

# Test pipeline
python pipeline.py test.wav output.wav
```

It will use fallback noise reduction and basic source separation - good enough to verify everything works!

