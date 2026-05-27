# ML Models Setup Guide

## Current Status

### ✅ Ready for Integration
- Pipeline structure is complete
- Backend service integration exists
- Fallback implementations provided

### ⚠️ Requires Setup

The ML models need to be installed and configured. Currently, they have placeholder/fallback implementations.

## Installation Steps

### 1. Install Python Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 2. Install ML Model Libraries

#### DeepFilterNet

```bash
# Option 1: Install from PyPI (recommended)
pip install deepfilternet

# Option 2: Install from source
git clone https://github.com/Rikorose/DeepFilterNet.git
cd DeepFilterNet
pip install -e .
```

**First-time model download:** DeepFilterNet will automatically download pre-trained models (~50-100MB) on first use.

#### Demucs

```bash
# Install Demucs
pip install demucs

# Or install specific model variants
pip install demucs[htdemucs]  # High-quality variant
```

**First-time model download:** Demucs will automatically download models (~500MB-2GB) on first use.

### 3. Verify Installation

```bash
python -c "from deepfilternet import DeepFilterNet; print('DeepFilterNet OK')"
python -c "import demucs; print('Demucs OK')"
python -c "import pyloudnorm; print('pyloudnorm OK')"
```

### 4. Test the Pipeline

```bash
cd ml
python pipeline.py test_input.wav test_output.wav
```

## Model Files Location

Models are automatically downloaded to:
- **DeepFilterNet**: `~/.cache/deepfilternet/` (or similar)
- **Demucs**: `~/.cache/torch/hub/checkpoints/` (or similar)

Ensure sufficient disk space (~5-10GB recommended).

## GPU Support (Optional but Recommended)

For faster processing:

```bash
# Install CUDA-compatible PyTorch
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118

# Verify GPU availability
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

## Fallback Behavior

If models fail to load:
- **DeepFilterNet**: Uses spectral subtraction (basic noise reduction)
- **Demucs**: Uses frequency-based separation (basic)

These provide basic functionality but lower quality than full ML models.

## Troubleshooting

### Import Errors

```bash
# Ensure all dependencies are installed
pip install --upgrade torch torchaudio librosa soundfile numpy scipy pyloudnorm

# Reinstall ML models
pip uninstall deepfilternet demucs
pip install deepfilternet demucs
```

### Model Download Failures

- Check internet connectivity
- Verify disk space (>10GB free)
- Check firewall settings
- Try manual download from model repositories

### CUDA Errors

- Use CPU-only version if GPU unavailable
- Install matching CUDA version for your system
- Check GPU compatibility

### Memory Errors

- Use smaller batch sizes
- Process shorter audio segments
- Close other applications
- Use CPU if GPU memory insufficient

## Current Implementation Status

### DeepFilterNet
- ✅ Model wrapper implemented
- ✅ Fallback implementation provided
- ⏳ Needs actual model installation
- ⏳ Model loading needs testing

### Demucs
- ✅ Model wrapper implemented
- ✅ Fallback implementation provided
- ⏳ Needs actual model installation
- ⏳ Source separation needs testing

### Pipeline
- ✅ Complete pipeline structure
- ✅ All steps implemented
- ⏳ Needs model testing
- ⏳ Performance optimization pending

## Next Steps

1. **Install dependencies** (see above)
2. **Test with sample audio file**
3. **Verify model downloads**
4. **Test full pipeline**
5. **Optimize for production**

## Production Considerations

- Models are large (~2-5GB total)
- Processing time: 1-5 min per minute of audio (CPU)
- GPU can reduce processing time by 5-10x
- Consider model quantization for faster inference
- May need dedicated GPU server for production

