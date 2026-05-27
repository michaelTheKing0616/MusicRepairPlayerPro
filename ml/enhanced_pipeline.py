"""
Enhanced Audio Repair Pipeline with Enhancement Settings

This pipeline extends the base repair pipeline with audio enhancement settings:
- EQ (10-band)
- Bass boost
- Treble enhancer
- Compressor
- Additional normalization

Usage:
    python enhanced_pipeline.py <input_path> <output_path> [--settings settings.json]
"""

import sys
import json
import argparse
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path

import structlog

logger = structlog.get_logger("ml.enhanced_pipeline")

# Import base pipeline functions
from pipeline import (
    denoise_audio,
    separate_sources,
    recombine_and_enhance,
    normalize_loudness,
)
from deepfilternet.model import DeepFilterNetModel
from demucs.model import DemucsModel
from utils.audio_utils import normalize_audio, resample_audio


def apply_bass_boost(audio: np.ndarray, sample_rate: int, level: float) -> np.ndarray:
    """
    Apply bass boost to audio.
    
    Args:
        audio: Input audio array
        sample_rate: Sample rate
        level: Boost level (0-100)
        
    Returns:
        Enhanced audio array
    """
    if level <= 0:
        return audio
    
    try:
        from scipy import signal
        
        # Calculate gain in dB (0-100 maps to 0-12dB)
        gain_db = (level / 100.0) * 12.0
        gain_linear = 10 ** (gain_db / 20.0)
        
        # Design a low-shelf filter for bass boost
        nyquist = sample_rate / 2
        cutoff = 250  # Hz - bass frequency range
        
        # Low-shelf filter
        sos = signal.iirfilter(
            4,
            cutoff / nyquist,
            btype='lowpass',
            ftype='butter',
            output='sos',
        )
        
        # Apply filter
        filtered_bass = signal.sosfilt(sos, audio)
        
        # Mix original with boosted bass
        enhanced = audio + (filtered_bass * (gain_linear - 1.0))
        
        # Normalize to prevent clipping
        max_val = np.abs(enhanced).max()
        if max_val > 0.95:
            enhanced = enhanced / max_val * 0.95
        
        return enhanced
    except ImportError:
        logger.warning("scipy_missing_skip_bass_boost")
        return audio


def apply_treble_enhancement(
    audio: np.ndarray,
    sample_rate: int,
    level: float,
) -> np.ndarray:
    """
    Apply treble enhancement to audio.
    
    Args:
        audio: Input audio array
        sample_rate: Sample rate
        level: Enhancement level (0-100)
        
    Returns:
        Enhanced audio array
    """
    if level <= 0:
        return audio
    
    try:
        from scipy import signal
        
        # Calculate gain in dB (0-100 maps to 0-12dB)
        gain_db = (level / 100.0) * 12.0
        gain_linear = 10 ** (gain_db / 20.0)
        
        # Design a high-shelf filter for treble
        nyquist = sample_rate / 2
        cutoff = 4000  # Hz - treble frequency range
        
        # High-pass filter
        sos = signal.iirfilter(
            4,
            cutoff / nyquist,
            btype='highpass',
            ftype='butter',
            output='sos',
        )
        
        # Apply filter
        filtered_treble = signal.sosfilt(sos, audio)
        
        # Mix original with enhanced treble
        enhanced = audio + (filtered_treble * (gain_linear - 1.0))
        
        # Normalize to prevent clipping
        max_val = np.abs(enhanced).max()
        if max_val > 0.95:
            enhanced = enhanced / max_val * 0.95
        
        return enhanced
    except ImportError:
        logger.warning("scipy_missing_skip_treble")
        return audio


def apply_eq_bands(
    audio: np.ndarray,
    sample_rate: int,
    bands: list,
) -> np.ndarray:
    """
    Apply 10-band EQ to audio.
    
    Args:
        audio: Input audio array
        sample_rate: Sample rate
        bands: List of EQ bands with frequency and gain
        
    Returns:
        EQ'd audio array
    """
    try:
        from scipy import signal
        
        nyquist = sample_rate / 2
        enhanced = audio.copy()
        
        for band in bands:
            freq = band.get('frequency', 0)
            gain_db = band.get('gain', 0)
            
            if abs(gain_db) < 0.1:  # Skip if gain is minimal
                continue
            
            gain_linear = 10 ** (gain_db / 20.0)
            
            # Create a band-pass filter around this frequency
            # Q factor determines bandwidth
            Q = 2.0
            
            # Calculate band edges
            center_freq = freq / nyquist
            bandwidth = center_freq / Q
            
            # Peaking EQ filter
            sos = signal.iirpeak(center_freq, Q, fs=sample_rate, output='sos')
            
            # Apply filter and mix
            filtered = signal.sosfilt(sos, audio)
            
            if gain_db > 0:
                enhanced = enhanced + (filtered * (gain_linear - 1.0))
            else:
                enhanced = enhanced - (filtered * (1.0 - gain_linear))
        
        # Normalize to prevent clipping
        max_val = np.abs(enhanced).max()
        if max_val > 0.95:
            enhanced = enhanced / max_val * 0.95
        
        return enhanced
    except ImportError:
        logger.warning("scipy_missing_skip_eq")
        return audio


def apply_compressor(
    audio: np.ndarray,
    threshold: float,
    ratio: float,
    attack: float,
    release: float,
) -> np.ndarray:
    """
    Apply audio compression.
    
    Args:
        audio: Input audio array
        threshold: Compression threshold in dB
        ratio: Compression ratio
        attack: Attack time in ms
        release: Release time in ms
        
    Returns:
        Compressed audio array
    """
    # Simple compression algorithm
    # Convert threshold to linear
    threshold_linear = 10 ** (threshold / 20.0)
    
    # Apply compression
    compressed = audio.copy()
    envelope = np.abs(audio)
    
    # Simple envelope follower
    for i in range(1, len(envelope)):
        if envelope[i] > envelope[i - 1]:
            # Attack
            envelope[i] = envelope[i - 1] + (envelope[i] - envelope[i - 1]) * (
                1 - np.exp(-1 / (attack * 0.001 * 44100))
            )
        else:
            # Release
            envelope[i] = envelope[i - 1] + (envelope[i] - envelope[i - 1]) * (
                1 - np.exp(-1 / (release * 0.001 * 44100))
            )
    
    # Apply compression curve
    for i in range(len(compressed)):
        if envelope[i] > threshold_linear:
            # Calculate reduction
            excess = envelope[i] - threshold_linear
            reduction = excess / ratio
            gain_reduction = (threshold_linear + reduction) / envelope[i]
            compressed[i] = compressed[i] * gain_reduction
    
    return compressed


def apply_auto_eq_mode(
    audio: np.ndarray,
    sample_rate: int,
    mode: str,
) -> np.ndarray:
    """
    Apply auto-EQ mode preset.
    
    Args:
        audio: Input audio array
        sample_rate: Sample rate
        mode: EQ mode ('studio', 'concert', 'warm', 'bright', 'flat')
        
    Returns:
        Enhanced audio array
    """
    # Define EQ curves for each mode
    mode_curves = {
        'studio': [
            {'frequency': 31, 'gain': 0},
            {'frequency': 62, 'gain': 0},
            {'frequency': 125, 'gain': 0},
            {'frequency': 250, 'gain': 0},
            {'frequency': 500, 'gain': 0},
            {'frequency': 1000, 'gain': 0},
            {'frequency': 2000, 'gain': 0},
            {'frequency': 4000, 'gain': 0},
            {'frequency': 8000, 'gain': 0},
            {'frequency': 16000, 'gain': 0},
        ],
        'concert': [
            {'frequency': 31, 'gain': 3},
            {'frequency': 62, 'gain': 4},
            {'frequency': 125, 'gain': 3},
            {'frequency': 250, 'gain': 1},
            {'frequency': 500, 'gain': 0},
            {'frequency': 1000, 'gain': 1},
            {'frequency': 2000, 'gain': 2},
            {'frequency': 4000, 'gain': 3},
            {'frequency': 8000, 'gain': 4},
            {'frequency': 16000, 'gain': 3},
        ],
        'warm': [
            {'frequency': 31, 'gain': 2},
            {'frequency': 62, 'gain': 3},
            {'frequency': 125, 'gain': 2},
            {'frequency': 250, 'gain': 1},
            {'frequency': 500, 'gain': 0},
            {'frequency': 1000, 'gain': -1},
            {'frequency': 2000, 'gain': -1},
            {'frequency': 4000, 'gain': 0},
            {'frequency': 8000, 'gain': 1},
            {'frequency': 16000, 'gain': 1},
        ],
        'bright': [
            {'frequency': 31, 'gain': -1},
            {'frequency': 62, 'gain': 0},
            {'frequency': 125, 'gain': 0},
            {'frequency': 250, 'gain': 0},
            {'frequency': 500, 'gain': 1},
            {'frequency': 1000, 'gain': 2},
            {'frequency': 2000, 'gain': 3},
            {'frequency': 4000, 'gain': 4},
            {'frequency': 8000, 'gain': 5},
            {'frequency': 16000, 'gain': 4},
        ],
        'flat': [
            {'frequency': 31, 'gain': 0},
            {'frequency': 62, 'gain': 0},
            {'frequency': 125, 'gain': 0},
            {'frequency': 250, 'gain': 0},
            {'frequency': 500, 'gain': 0},
            {'frequency': 1000, 'gain': 0},
            {'frequency': 2000, 'gain': 0},
            {'frequency': 4000, 'gain': 0},
            {'frequency': 8000, 'gain': 0},
            {'frequency': 16000, 'gain': 0},
        ],
    }
    
    bands = mode_curves.get(mode, mode_curves['flat'])
    return apply_eq_bands(audio, sample_rate, bands)


def main():
    """Main enhanced pipeline function."""
    parser = argparse.ArgumentParser(description='Enhanced Audio Repair Pipeline')
    parser.add_argument('input_path', type=str, help='Path to input audio file')
    parser.add_argument('output_path', type=str, help='Path to output audio file')
    parser.add_argument(
        '--settings',
        type=str,
        help='Path to JSON file with enhancement settings',
        default=None,
    )
    
    args = parser.parse_args()
    
    input_path = Path(args.input_path)
    output_path = Path(args.output_path)
    
    # Load enhancement settings if provided
    settings = None
    if args.settings:
        with open(args.settings, 'r') as f:
            settings = json.load(f)
    
    # Validate input file exists
    if not input_path.exists():
        logger.error("input_not_found", path=str(input_path))
        sys.exit(1)
    
    try:
        # Load audio file
        logger.info("loading_audio", path=str(input_path))
        audio, sample_rate = librosa.load(str(input_path), sr=None, mono=False)
        
        # Convert to mono if stereo
        if len(audio.shape) > 1:
            logger.info("convert_stereo_to_mono")
            audio = np.mean(audio, axis=0)
        
        original_sample_rate = sample_rate
        
        # Initialize models
        deepfilternet = DeepFilterNetModel()
        demucs = DemucsModel()
        
        # Base pipeline steps
        # Step 1: Denoise
        denoised_audio, sample_rate = denoise_audio(audio, sample_rate, deepfilternet)
        
        # Step 2: Source separation
        separated, sample_rate = separate_sources(denoised_audio, sample_rate, demucs)
        
        # Step 3: Recombine and enhance
        enhanced_audio = recombine_and_enhance(separated, sample_rate)
        
        # Apply enhancement settings if provided
        if settings:
            logger.info("applying_enhancement_settings")
            
            # EQ
            if settings.get('eq', {}).get('enabled', False):
                bands = settings['eq'].get('bands', [])
                enhanced_audio = apply_eq_bands(enhanced_audio, sample_rate, bands)
            
            # Auto-EQ mode
            if settings.get('autoEQ', {}).get('enabled', False):
                mode = settings['autoEQ'].get('mode', 'flat')
                enhanced_audio = apply_auto_eq_mode(enhanced_audio, sample_rate, mode)
            
            # Bass boost
            if settings.get('bassBoost', {}).get('enabled', False):
                level = settings['bassBoost'].get('level', 50)
                enhanced_audio = apply_bass_boost(enhanced_audio, sample_rate, level)
            
            # Treble enhancer
            if settings.get('trebleEnhancer', {}).get('enabled', False):
                level = settings['trebleEnhancer'].get('level', 50)
                enhanced_audio = apply_treble_enhancement(
                    enhanced_audio,
                    sample_rate,
                    level,
                )
            
            # Compressor
            if settings.get('compressor', {}).get('enabled', False):
                comp = settings['compressor']
                enhanced_audio = apply_compressor(
                    enhanced_audio,
                    comp.get('threshold', -12),
                    comp.get('ratio', 4),
                    comp.get('attack', 10),
                    comp.get('release', 100),
                )
        
        # Resample back to original if needed
        if sample_rate != original_sample_rate:
            logger.info("resample_to_original", sample_rate=original_sample_rate)
            enhanced_audio = resample_audio(enhanced_audio, sample_rate, original_sample_rate)
            sample_rate = original_sample_rate
        
        # Step 4: Normalize loudness (use settings target if available)
        target_lufs = -16.0
        if settings and settings.get('normalizer', {}).get('enabled', False):
            target_db = settings['normalizer'].get('targetLevel', -16)
            # Convert dB to LUFS approximation
            target_lufs = target_db
        
        normalized_audio = normalize_loudness(enhanced_audio, sample_rate, target_lufs)
        
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Step 5: Export cleaned file
        logger.info("exporting_enhanced", output_path=str(output_path))
        sf.write(str(output_path), normalized_audio, sample_rate)
        
        logger.info("enhanced_pipeline_completed", output_path=str(output_path))
        
    except Exception as e:
        logger.exception("enhanced_pipeline_failed", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()

