# DeepFilterNet Installation Fix

## Issue
DeepFilterNet requires Rust/Cargo to compile, which caused the installation error.

## Solutions

### Option 1: Install Rust (Recommended for Production)
```bash
# Install Rust from https://rustup.rs/
# Or on Windows:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Then retry:
pip install deepfilternet
```

### Option 2: Use Pre-built Wheels (Easier)
Try installing with pre-built wheels:
```bash
pip install deepfilternet --only-binary=all
```

### Option 3: Use Alternative Model (Quick Fix)
We can use a simpler noise reduction library that doesn't require Rust. The fallback implementation will work, and we can enhance it later.

### Option 4: Skip DeepFilterNet for Now
The pipeline will use the fallback implementation, which works but with lower quality. You can proceed with testing and install DeepFilterNet later.

## Quick Fix - Continue Without Rust

For now, let's install everything except DeepFilterNet:

```bash
cd ml
pip install torch torchaudio numpy scipy librosa soundfile demucs pyloudnorm supabase tqdm python-dotenv
```

The fallback implementation in `deepfilternet/model.py` will handle denoising without the full model.

