"""
Audio processing utilities
"""
import numpy as np
import librosa
import soundfile as sf
from typing import Tuple, Optional
import structlog

logger = structlog.get_logger()


def load_audio(file_path: str, sr: int = 44100, mono: bool = True) -> Tuple[np.ndarray, int]:
    """Load audio file"""
    try:
        audio, sample_rate = librosa.load(file_path, sr=sr, mono=mono)
        return audio, sample_rate
    except Exception as e:
        logger.error("Failed to load audio", file_path=file_path, error=str(e))
        raise


def save_audio(audio: np.ndarray, file_path: str, sr: int = 44100):
    """Save audio file"""
    try:
        sf.write(file_path, audio, sr)
    except Exception as e:
        logger.error("Failed to save audio", file_path=file_path, error=str(e))
        raise


def normalize_audio(audio: np.ndarray, target_lufs: float = -16.0, sr: int = 44100) -> np.ndarray:
    """Normalize audio to target LUFS"""
    try:
        import pyloudnorm as pyln
        
        meter = pyln.Meter(sr)
        loudness = meter.integrated_loudness(audio)
        
        if not np.isnan(loudness):
            normalized = pyln.normalize.loudness(audio, loudness, target_lufs)
        else:
            normalized = audio
        
        # Peak normalization (safety)
        max_val = np.abs(normalized).max()
        if max_val > 0.95:
            normalized = normalized * (0.95 / max_val)
        
        return normalized
    except Exception as e:
        logger.warning("Loudness normalization failed", error=str(e))
        # Fallback to peak normalization
        max_val = np.abs(audio).max()
        if max_val > 0:
            return audio / max_val * 0.95
        return audio


def extract_f0(audio: np.ndarray, sr: int = 16000, method: str = "crepe") -> Tuple[np.ndarray, np.ndarray]:
    """
    Extract fundamental frequency (pitch) from audio
    
    Returns:
        f0: Fundamental frequency array
        confidence: Confidence array
    """
    try:
        if method == "crepe":
            import crepe
            f0, confidence, _ = crepe.predict(audio, sr, viterbi=True)
            return f0, confidence
        elif method == "pyworld":
            import pyworld as pw
            f0, _ = pw.harvest(audio.astype(np.float64), sr)
            confidence = np.ones_like(f0)
            return f0, confidence
        else:
            # Fallback to librosa
            f0, voiced_flag, _ = librosa.pyin(audio, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
            confidence = voiced_flag.astype(float)
            return f0, confidence
    except Exception as e:
        logger.warning("F0 extraction failed", error=str(e), method=method)
        # Return zeros as fallback
        return np.zeros(len(audio) // 512), np.zeros(len(audio) // 512)


def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """Resample audio"""
    if orig_sr == target_sr:
        return audio
    return librosa.resample(audio, orig_sr=orig_sr, target_sr=target_sr)


def get_audio_info(file_path: str) -> dict:
    """Get audio file information"""
    try:
        info = sf.info(file_path)
        duration = info.duration
        
        # Try to load a sample to get more info
        audio, sr = librosa.load(file_path, sr=None, duration=1.0)
        
        return {
            "duration": duration,
            "sample_rate": info.samplerate,
            "channels": info.channels,
            "format": info.format,
            "subtype": info.subtype,
        }
    except Exception as e:
        logger.error("Failed to get audio info", file_path=file_path, error=str(e))
        raise

