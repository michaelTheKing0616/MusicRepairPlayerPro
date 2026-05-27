import importlib.util
import io
from pathlib import Path

import numpy as np
import soundfile as sf

_ROOT = Path(__file__).resolve().parent.parent
_MOD_PATH = _ROOT / "app" / "services" / "audio_analysis.py"


def _load_analyze_fn():
    spec = importlib.util.spec_from_file_location("audio_analysis_standalone", _MOD_PATH)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod.analyze_audio_bytes


def _wav_bytes(y: np.ndarray, sr: int) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV")
    return buf.getvalue()


def test_analyze_audio_bytes_sinewav():
    analyze_audio_bytes = _load_analyze_fn()
    sr = 8000
    t = np.linspace(0, 0.05, int(sr * 0.05), endpoint=False)
    y = (0.1 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    stats = analyze_audio_bytes(_wav_bytes(y, sr))
    assert stats["channels"] >= 1
    assert stats["sample_rate"] == sr
    assert stats["duration_sec"] > 0
