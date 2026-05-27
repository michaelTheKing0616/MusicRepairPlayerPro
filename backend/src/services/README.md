# Audio Repair Service

The audio repair service implements a complete ML-powered audio enhancement pipeline.

## Overview

The `audioRepairService.ts` orchestrates the following pipeline:

1. **Download** audio file from Supabase storage
2. **Process** through ML pipeline (Python)
3. **Upload** cleaned file back to Supabase
4. **Return** public URL of cleaned file

## Pipeline Steps (Python)

The ML pipeline (`ml/pipeline.py`) performs:

1. **Denoise** using DeepFilterNet - removes background noise while preserving speech/music
2. **Source Separation** using Demucs - separates into drums, bass, vocals, and other
3. **Recombine & Enhance** - intelligently recombines sources with optimal weights
4. **Normalize Loudness** - uses EBU R128 standard (-16 LUFS) for consistent playback
5. **Export** cleaned audio file

## Usage

```typescript
import { audioRepairService } from './services/audioRepairService';

const result = await audioRepairService.repairAudio(
  'userId/input-file.mp3',  // Input path in Supabase
  'userId/repaired-file.mp3' // Output path in Supabase
);

if (result.status === 'success') {
  console.log('Cleaned file URL:', result.url);
} else {
  console.error('Error:', result.error);
}
```

## Return Format

```typescript
{
  status: "success" | "error",
  url?: string,      // Public URL of cleaned file (if success)
  error?: string     // Error message (if error)
}
```

## Architecture

```
┌─────────────────┐
│  TypeScript     │
│  Service        │
└────────┬────────┘
         │
         ├─► Downloads from Supabase
         │
         ├─► Calls Python pipeline
         │   └─► DeepFilterNet (denoise)
         │   └─► Demucs (separate)
         │   └─► Recombine & enhance
         │   └─► Pyloudnorm (normalize)
         │
         ├─► Uploads to Supabase
         │
         └─► Returns public URL
```

## Prerequisites

- Python 3.8+ installed and in PATH
- ML dependencies installed (`pip install -r ml/requirements.txt`)
- Supabase storage configured
- Sufficient disk space for temporary files

## Error Handling

The service includes comprehensive error handling:

- Automatic cleanup of temporary files
- Detailed error messages
- Fallback processing when ML models are unavailable
- Validation of input/output paths

## Configuration

The service automatically determines paths based on project structure:

- Python script: `ml/pipeline.py`
- Temp directory: System temp directory (`os.tmpdir()`)

Adjust paths in the constructor if your structure differs.

## Performance

- Processing time: Varies by audio length (typically 1-5 minutes per minute of audio)
- Memory usage: ~2-4GB RAM depending on model sizes
- GPU: Optional but recommended for faster processing

## Troubleshooting

**Python not found:**
- Ensure Python 3.8+ is installed
- Add Python to system PATH

**ML models fail to load:**
- Install dependencies: `pip install -r ml/requirements.txt`
- Check model download permissions
- Verify disk space

**Supabase upload fails:**
- Check credentials in `.env`
- Verify bucket permissions
- Check network connectivity

