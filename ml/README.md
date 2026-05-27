# ML Models for Audio Repair

This directory contains the machine learning models and services for audio repair functionality.

## Models

### DeepFilterNet
DeepFilterNet is used for real-time speech enhancement and noise reduction.

**Status:** Placeholder - Implementation pending

### Demucs
Demucs is used for source separation and audio demixing.

**Status:** Placeholder - Implementation pending

### UVR (Ultimate Vocal Remover)
UVR is used for vocal removal and isolation.

**Status:** Placeholder - Implementation pending

## Structure

```
ml/
├── deepfilternet/       # DeepFilterNet model and utilities
│   ├── __init__.py
│   ├── model.py         # Model loading and inference
│   └── processor.py     # Audio preprocessing
├── demucs/              # Demucs model and utilities
│   ├── __init__.py
│   ├── model.py         # Model loading and inference
│   └── processor.py     # Audio preprocessing
├── uvr/                 # UVR model and utilities
│   ├── __init__.py
│   ├── model.py         # Model loading and inference
│   └── processor.py     # Audio preprocessing
├── utils/               # Shared utilities
│   ├── __init__.py
│   ├── audio_utils.py   # Audio processing utilities
│   └── storage.py       # File storage helpers
└── service.py           # Main ML service orchestrator
```

## Future Implementation

1. Install required dependencies (PyTorch, librosa, etc.)
2. Download pre-trained models
3. Implement model loading and inference
4. Create audio preprocessing pipelines
5. Integrate with backend API
6. Add model evaluation and metrics

## Integration

The ML service will be called from the backend API endpoint:
- `POST /api/audio/repair`

The service will:
1. Download audio file from Supabase
2. Process with selected model
3. Upload repaired audio to Supabase
4. Update database with results

