"""
Audio Processing Utilities

Common utilities for audio processing across all ML models.
"""

from typing import Optional
import numpy as np


def load_audio(file_path: str, sample_rate: Optional[int] = None) -> tuple[np.ndarray, int]:
    """
    Load audio file using librosa.
    
    Args:
        file_path: Path to audio file
        sample_rate: Target sample rate (optional, if None uses original)
        
    Returns:
        Tuple of (audio_array, sample_rate)
    """
    try:
        import librosa
        
        # Load audio (mono, float32, normalized to [-1, 1])
        audio, sr = librosa.load(file_path, sr=sample_rate, mono=True)
        
        return audio, sr
    except ImportError:
        raise ImportError("librosa is required for audio loading. Install with: pip install librosa")
    except Exception as e:
        raise RuntimeError(f"Error loading audio file {file_path}: {e}")


def save_audio(audio: np.ndarray, file_path: str, sample_rate: int = 44100) -> bool:
    """
    Save audio array to file using soundfile.
    
    Args:
        audio: Audio array to save (float32, [-1, 1])
        file_path: Output file path
        sample_rate: Sample rate of audio
        
    Returns:
        True if successful
    """
    try:
        import soundfile as sf
        
        # Ensure audio is float32
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)
        
        # Normalize to prevent clipping
        max_val = np.abs(audio).max()
        if max_val > 1.0:
            audio = audio / max_val * 0.95
        
        # Save file
        sf.write(file_path, audio, sample_rate)
        return True
    except ImportError:
        raise ImportError("soundfile is required for audio saving. Install with: pip install soundfile")
    except Exception as e:
        print(f"Error saving audio file {file_path}: {e}")
        return False


def normalize_audio(audio: np.ndarray) -> np.ndarray:
    """
    Normalize audio to [-1, 1] range.
    
    Args:
        audio: Input audio array
        
    Returns:
        Normalized audio array
    """
    # Find maximum absolute value
    max_val = np.abs(audio).max()
    
    # Avoid division by zero
    if max_val == 0:
        return audio
    
    # Normalize to [-1, 1]
    normalized = audio / max_val
    
    return normalized.astype(np.float32)


def resample_audio(audio: np.ndarray, original_sr: int, target_sr: int) -> np.ndarray:
    """
    Resample audio to target sample rate using librosa.
    
    Args:
        audio: Input audio array
        original_sr: Original sample rate
        target_sr: Target sample rate
        
    Returns:
        Resampled audio array
    """
    if original_sr == target_sr:
        return audio
    
    try:
        import librosa
        
        # Resample audio
        resampled = librosa.resample(
            audio,
            orig_sr=original_sr,
            target_sr=target_sr,
            res_type='kaiser_best',
        )
        
        return resampled.astype(np.float32)
    except ImportError:
        raise ImportError("librosa is required for audio resampling. Install with: pip install librosa")
    except Exception as e:
        raise RuntimeError(f"Error resampling audio: {e}")

