"""
Deterministic feature extraction from in-memory audio bytes (WAV/FLAC/MP3 via soundfile).
Used for `/audio/.../analyze` and damage-style hints.
"""
from __future__ import annotations

import io
from typing import Any

import numpy as np
import soundfile as sf

try:
    import librosa
except Exception:  # pragma: no cover
    librosa = None


def analyze_audio_bytes(data: bytes) -> dict[str, Any]:
    bio = io.BytesIO(data)
    y, sr = sf.read(bio, always_2d=True)
    channels = int(y.shape[1]) if y.ndim > 1 else 1
    y = np.mean(y.astype(np.float64, copy=False), axis=1)
    n = len(y)
    duration = float(n / sr) if sr else 0.0
    peak = float(np.max(np.abs(y))) if n else 0.0
    rms = float(np.sqrt(np.mean(np.square(y)))) if n else 0.0
    clipped = float(np.mean(np.abs(y) >= 0.989)) if n else 0.0
    zcr = float(np.mean(np.abs(np.diff(np.signbit(y))))) if n > 1 else 0.0

    centroid_mean = 0.0
    if librosa is not None and n > 1024:
        cent = librosa.feature.spectral_centroid(y=y, sr=sr)
        centroid_mean = float(np.mean(cent))

    damage_hints: dict[str, Any] = {
        "likelyClipping": clipped > 0.001,
        "lowDynamicRange": rms > 0 and peak / (rms + 1e-9) < 2.5,
        "heavySilence": float(np.mean(np.abs(y) < 1e-4)) > 0.4 if n else False,
        "spectralBrightnessHz": centroid_mean,
    }

    return {
        "duration_sec": duration,
        "sample_rate": int(sr),
        "channels": channels,
        "peak": peak,
        "rms": rms,
        "clipping_ratio": clipped,
        "zero_crossing_rate": zcr,
        "spectral_centroid_hz_mean": centroid_mean,
        "damage_hints": damage_hints,
    }
