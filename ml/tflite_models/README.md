# TFLite Models Integration

## Overview

This directory is prepared for TensorFlow Lite model integration as an alternative to PyTorch models for mobile deployment.

## Benefits of TFLite

- **Smaller model size**: Optimized for mobile
- **Faster inference**: Optimized for mobile hardware
- **Lower memory usage**: Better for resource-constrained devices
- **Cross-platform**: Works on iOS and Android

## Model Conversion

### Converting PyTorch to TFLite

```bash
# Install TensorFlow
pip install tensorflow

# Convert model (example script)
python convert_to_tflite.py
```

### Using Pre-trained TFLite Models

1. Download or convert models to `.tflite` format
2. Place in this directory
3. Update model loading in pipeline

## Implementation

The pipeline supports both PyTorch and TFLite models:

```python
# In model classes
if use_tflite:
    import tflite_runtime.interpreter as tflite
    # Load TFLite model
else:
    import torch
    # Load PyTorch model
```

## Status

- ✅ Structure prepared
- ⏳ Model conversion scripts (to be added)
- ⏳ TFLite runtime integration (to be added)

## Future Implementation

When implementing TFLite:
1. Convert DeepFilterNet to TFLite
2. Convert Demucs to TFLite
3. Update model loading logic
4. Add mobile-optimized inference

