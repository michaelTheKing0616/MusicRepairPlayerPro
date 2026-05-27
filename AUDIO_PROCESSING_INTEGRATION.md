# Audio Processing Integration Guide

## ✅ What's Ready

### 1. ML Pipeline (Backend)
- ✅ Complete pipeline structure (`ml/pipeline.py`)
- ✅ Enhanced pipeline with audio settings (`ml/enhanced_pipeline.py`)
- ✅ Backend service integration (`backend/src/services/audioRepairService.ts`)
- ✅ API endpoint accepts enhancement settings
- ⚠️ **ML models need installation** (see ML_MODELS_SETUP.md)

### 2. Audio Enhancement Settings (Frontend)
- ✅ Complete UI for all enhancement settings
- ✅ AsyncStorage persistence
- ✅ Settings service (`audioSettingsService.ts`)
- ✅ React hook (`useAudioSettings.ts`)

### 3. Integration Points
- ✅ Backend accepts enhancement settings in repair request
- ✅ Enhanced pipeline processes audio with settings
- ⏳ Real-time client-side processing (pending)

## 🔧 ML Models Status

### Current State
The ML pipeline is **structurally complete** but models need to be installed:

1. **DeepFilterNet** - Has fallback implementation, needs model installation
2. **Demucs** - Has fallback implementation, needs model installation
3. **Audio Processing** - All enhancement functions implemented in enhanced_pipeline.py

### What You Need to Do

**1. Install Python Dependencies:**
```bash
cd ml
pip install -r requirements.txt
```

**2. Install ML Models:**
```bash
pip install deepfilternet demucs
```

**3. Verify Installation:**
```bash
python -c "from deepfilternet import DeepFilterNet; print('OK')"
python -c "import demucs; print('OK')"
```

**4. Test Pipeline:**
```bash
cd ml
python enhanced_pipeline.py input.wav output.wav --settings settings.json
```

See `ML_MODELS_SETUP.md` for detailed setup instructions.

## 🎛️ How Enhancement Settings Work

### Server-Side Processing

When you submit a repair request with enhancement settings:

```typescript
// Frontend API call
await apiService.repairAudio(audioFileId, 'deepfilternet', {
  eq: { enabled: true, bands: [...] },
  bassBoost: { enabled: true, level: 75 },
  // ... other settings
});
```

**Backend Flow:**
1. Receives repair request with enhancement settings
2. Creates temporary settings JSON file
3. Calls `enhanced_pipeline.py` with `--settings` flag
4. Python pipeline applies:
   - Base repair (denoise, separate, recombine)
   - Enhancement settings (EQ, bass, treble, etc.)
   - Final normalization
5. Uploads processed file to Supabase
6. Returns cleaned file URL

### Settings Applied in Order

1. **Base Repair:**
   - DeepFilterNet denoising
   - Demucs source separation
   - Recombination

2. **Enhancement Settings:**
   - EQ (10-band) if enabled
   - Auto-EQ mode if enabled
   - Bass boost if enabled
   - Treble enhancer if enabled
   - Compressor if enabled

3. **Final:**
   - Loudness normalization (uses normalizer target if set)

## 📡 API Usage

### Repair Audio with Enhancements

```typescript
POST /api/audio/repair
{
  "audioFileId": "uuid",
  "modelType": "deepfilternet",
  "enhancementSettings": {
    "eq": {
      "enabled": true,
      "bands": [
        {"frequency": 31, "gain": 3},
        {"frequency": 62, "gain": 4},
        // ... more bands
      ]
    },
    "bassBoost": {
      "enabled": true,
      "level": 75
    },
    "trebleEnhancer": {
      "enabled": false,
      "level": 50
    },
    "compressor": {
      "enabled": true,
      "threshold": -12,
      "ratio": 4,
      "attack": 10,
      "release": 100
    },
    "normalizer": {
      "enabled": true,
      "targetLevel": -16
    },
    "autoEQ": {
      "enabled": false,
      "mode": "warm"
    }
  }
}
```

## 🎵 Client-Side Real-Time Processing

### Current Limitation

React Native Track Player has **limited built-in EQ support**. For real-time effects during playback, you have two options:

### Option 1: Server-Side Pre-Processing (Recommended)

Process audio files with enhancement settings before playback:

```typescript
// When user adjusts settings
const { settings } = useAudioSettings();

// Create a new processed version
await apiService.processAudioWithSettings(audioFileId, settings);

// Play the processed version
```

### Option 2: Native Module (Advanced)

Create a native module for real-time audio processing:

- **Android**: Use AudioEffect API or custom audio processing
- **iOS**: Use AVAudioEngine with AVAudioUnitEQ

This requires:
- Native module development
- Audio processing expertise
- Performance optimization

### Recommended Approach

**Hybrid Solution:**
1. **Server-side processing** for permanent enhancements
2. **Simple client-side effects** (volume, basic EQ via TrackPlayer if available)
3. **Pre-process popular tracks** with common enhancement presets

## 🔄 Integration Checklist

### Backend
- [x] Enhanced pipeline created
- [x] Backend service updated
- [x] API accepts enhancement settings
- [ ] ML models installed and tested
- [ ] Test with real audio files

### Frontend
- [x] Settings UI complete
- [x] Settings persistence working
- [ ] Connect settings to repair API call
- [ ] Show enhancement preview option
- [ ] Save processed versions

### Testing
- [ ] Test pipeline with sample audio
- [ ] Test each enhancement individually
- [ ] Test multiple enhancements together
- [ ] Performance testing (processing time)
- [ ] Quality testing (audio output)

## 🚀 Next Steps

1. **Install ML Models** (see ML_MODELS_SETUP.md)
2. **Test Enhanced Pipeline**:
   ```bash
   cd ml
   python enhanced_pipeline.py test.wav output.wav --settings test_settings.json
   ```
3. **Connect Frontend to Backend**:
   - Update `AudioRepairUploadScreen` to send enhancement settings
   - Show enhancement options before repair
4. **Add Enhancement Preview**:
   - Quick preview with settings
   - Save enhancement presets

## 📝 Notes

- **Processing Time**: With enhancements, expect 1-5 minutes per minute of audio
- **File Size**: Enhanced files may be larger due to processing
- **Quality**: ML models provide best results, fallbacks are basic
- **Storage**: Processed files stored separately (can cache popular combinations)

## 🔍 Troubleshooting

### ML Models Not Loading
- Check installation: `pip list | grep deepfilternet`
- Verify Python path in backend service
- Check model download permissions

### Enhancement Settings Not Applied
- Verify settings JSON format
- Check pipeline logs for errors
- Test with minimal settings first

### Processing Errors
- Check disk space (>10GB recommended)
- Verify audio file format support
- Check Python dependencies

