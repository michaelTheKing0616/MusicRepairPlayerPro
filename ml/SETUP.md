# ML Pipeline Setup Guide

## Installation

### 1. Install Python Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 2. Install ML Models

#### DeepFilterNet

```bash
# DeepFilterNet will automatically download models on first use
# Or install manually:
pip install deepfilternet
```

#### Demucs

```bash
# Demucs will automatically download models on first use
# Or install manually:
pip install demucs
```

### 3. Verify Installation

```bash
python -c "import deepfilternet; import demucs; import pyloudnorm; print('All models installed!')"
```

## Model Downloads

Both DeepFilterNet and Demucs will automatically download pre-trained models on first use. This may take several minutes and requires internet connectivity.

- **DeepFilterNet**: ~50MB
- **Demucs**: ~500MB-2GB (depending on model variant)

## Testing the Pipeline

### Manual Test

```bash
cd ml
python pipeline.py input.wav output.wav
```

### Integration Test

The pipeline is automatically called by the backend service when processing repair requests.

## Performance Optimization

### GPU Acceleration

Both models support GPU acceleration if CUDA is available:

```bash
# Verify CUDA installation
python -c "import torch; print(torch.cuda.is_available())"
```

### Memory Optimization

For large files, consider:
- Processing in chunks
- Reducing batch size
- Using smaller model variants

## Fallback Behavior

If ML models are not available, the pipeline uses fallback methods:
- **DeepFilterNet**: Spectral subtraction noise reduction
- **Demucs**: Frequency-based source separation

These fallbacks provide basic processing but with lower quality results.

## Troubleshooting

### Import Errors

```bash
# Ensure you're in the ml directory
cd ml
python -m pip install -r requirements.txt
```

### Model Download Issues

- Check internet connectivity
- Verify disk space (>5GB free recommended)
- Check firewall settings

### CUDA Errors

- Install CUDA-compatible PyTorch: `pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118`
- Or use CPU-only version (slower but works everywhere)

### Memory Errors

- Process shorter audio segments
- Use CPU instead of GPU
- Close other applications

