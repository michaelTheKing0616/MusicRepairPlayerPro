# Audio Repair Service Implementation

## Overview

The audio repair service has been fully implemented with a complete ML-powered pipeline that processes audio files through multiple enhancement stages.

## Architecture

### TypeScript Service (`backend/src/services/audioRepairService.ts`)

The service orchestrates the entire repair process:

1. **Downloads** audio file from Supabase storage
2. **Calls** Python ML pipeline script
3. **Uploads** cleaned file back to Supabase
4. **Returns** public URL of cleaned file

### Python Pipeline (`ml/pipeline.py`)

The pipeline performs the following steps:

1. **Denoise** - Uses DeepFilterNet to remove background noise
2. **Source Separation** - Uses Demucs to separate into drums, bass, vocals, and other
3. **Recombine & Enhance** - Intelligently recombines sources with optimal weights
4. **Normalize Loudness** - Uses EBU R128 standard (-16 LUFS) via pyloudnorm
5. **Export** - Saves cleaned audio file

## API Usage

### Service Method

```typescript
import { audioRepairService } from './services/audioRepairService';

const result = await audioRepairService.repairAudio(
  'userId/input-file.mp3',      // Input path in Supabase
  'userId/repaired-file.mp3'     // Output path in Supabase
);

// Result format:
{
  status: "success" | "error",
  url?: string,      // Public URL (if success)
  error?: string     // Error message (if error)
}
```

### Integration in Controller

The service is automatically called when a repair request is created via `POST /api/audio/repair`. The processing happens asynchronously:

1. Controller creates repair request with status "PENDING"
2. Status updates to "PROCESSING"
3. Audio repair service runs pipeline
4. Status updates to "COMPLETED" or "FAILED"
5. Database updated with cleaned file URL

## Pipeline Steps Details

### Step 1: Denoise (DeepFilterNet)

- **Purpose**: Remove background noise while preserving audio quality
- **Input**: Raw audio file
- **Output**: Denoised audio
- **Sample Rate**: 16kHz (resampled if needed)

### Step 2: Source Separation (Demucs)

- **Purpose**: Separate audio into individual instrument/vocal tracks
- **Input**: Denoised audio
- **Output**: Dictionary with drums, bass, vocals, other
- **Sample Rate**: 44.1kHz (resampled if needed)

### Step 3: Recombine & Enhance

- **Purpose**: Intelligently recombine separated sources with emphasis on cleaner elements
- **Weights**:
  - Vocals: 1.2x (emphasized)
  - Bass: 1.0x
  - Drums: 0.9x
  - Other: 0.8x
- **Output**: Recombined enhanced audio

### Step 4: Normalize Loudness

- **Purpose**: Achieve consistent playback volume across different devices
- **Standard**: EBU R128 (-16 LUFS)
- **Tool**: pyloudnorm
- **Fallback**: RMS normalization if pyloudnorm unavailable

### Step 5: Export

- **Format**: Same as input format (MP3, WAV, FLAC, etc.)
- **Sample Rate**: Original sample rate (resampled back if needed)
- **Output**: Saved to specified path

## File Structure

```
MusicRepairApp/
├── backend/
│   └── src/
│       └── services/
│           ├── audioRepairService.ts    # TypeScript service
│           └── README.md                # Service documentation
│       └── controllers/
│           └── audio.controller.ts      # Integrated with service
│
└── ml/
    ├── pipeline.py                      # Main pipeline script
    ├── SETUP.md                         # Setup guide
    ├── requirements.txt                 # Python dependencies
    ├── deepfilternet/
    │   └── model.py                     # DeepFilterNet implementation
    ├── demucs/
    │   └── model.py                     # Demucs implementation
    └── utils/
        └── audio_utils.py               # Audio utilities
```

## Dependencies

### Python (ml/requirements.txt)

- `torch>=2.0.0` - PyTorch for ML models
- `torchaudio>=2.0.0` - Audio processing
- `librosa>=0.10.0` - Audio loading/processing
- `soundfile>=0.12.0` - Audio file I/O
- `deepfilternet>=0.5.0` - Noise reduction
- `demucs>=4.0.0` - Source separation
- `pyloudnorm>=0.1.1` - Loudness normalization
- `scipy>=1.10.0` - Signal processing
- `numpy>=1.24.0` - Numerical operations

### Node.js (Already in package.json)

- All required dependencies already present

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 2. Verify Python Installation

The service requires Python 3.8+ in your system PATH. Verify:

```bash
python --version  # Should be 3.8+
```

### 3. Test Pipeline Manually (Optional)

```bash
cd ml
python pipeline.py input.wav output.wav
```

### 4. Start Backend

```bash
cd backend
npm run dev
```

The service will automatically use the ML pipeline when processing repair requests.

## Error Handling

The implementation includes comprehensive error handling:

1. **Service Level**:
   - Validates file paths
   - Handles Supabase download/upload errors
   - Cleans up temporary files on errors
   - Returns detailed error messages

2. **Pipeline Level**:
   - Validates input file exists
   - Handles model loading failures
   - Falls back to basic processing if models unavailable
   - Provides detailed error logs

3. **Database Level**:
   - Updates status to "FAILED" on errors
   - Stores error messages in repair request
   - Updates audio file status accordingly

## Performance Considerations

- **Processing Time**: 1-5 minutes per minute of audio (CPU), faster with GPU
- **Memory**: ~2-4GB RAM depending on model sizes
- **Storage**: Temporary files created during processing (auto-cleaned)
- **GPU**: Optional but recommended for faster processing

## Fallback Behavior

If ML models are not available, the pipeline uses fallback methods:

- **DeepFilterNet**: Spectral subtraction noise reduction
- **Demucs**: Frequency-based source separation (basic)

These provide basic processing but with lower quality than full ML models.

## Testing

### Unit Test (Manual)

```bash
# In ml directory
python pipeline.py test_input.wav test_output.wav
```

### Integration Test

1. Upload audio file via API
2. Create repair request via `POST /api/audio/repair`
3. Check repair request status via `GET /api/audio/repair/:id`
4. Download cleaned file from returned URL

## Troubleshooting

See:
- `backend/src/services/README.md` - Service troubleshooting
- `ml/SETUP.md` - ML setup troubleshooting

## Future Enhancements

Potential improvements:
- GPU acceleration for faster processing
- Batch processing for multiple files
- Progress tracking and status updates
- Customizable model parameters
- Additional audio enhancement options

