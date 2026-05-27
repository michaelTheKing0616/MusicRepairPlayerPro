"""
Audio Repair Pipeline

This script implements the complete audio repair pipeline:
1. Denoise using DeepFilterNet
2. Source separation using Demucs
3. Recombine + enhance
4. Normalize using loudness leveling algorithm
5. Export cleaned file

Usage:
    python pipeline.py <input_path> <output_path>
"""

import sys
import os
import argparse
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path

import structlog

# Add ml directory to path for imports
ml_dir = Path(__file__).parent
sys.path.insert(0, str(ml_dir))

logger = structlog.get_logger("ml.pipeline")

from deepfilternet.model import DeepFilterNetModel
from demucs.model import DemucsModel
from utils.audio_utils import normalize_audio, resample_audio


def denoise_audio(audio: np.ndarray, sample_rate: int, model: DeepFilterNetModel) -> np.ndarray:
    """
    Step 1: Denoise audio using DeepFilterNet.
    
    Args:
        audio: Input audio array
        sample_rate: Sample rate of audio
        model: DeepFilterNet model instance
        
    Returns:
        Denoised audio array
    """
    logger.info("step_1_denoise_start")
    
    # Ensure model is loaded
    if not model.is_loaded:
        logger.info("loading_deepfilternet")
        model.load()
    
    # DeepFilterNet expects 16kHz sample rate
    if sample_rate != 16000:
        logger.info("resampling_for_dfn", from_sr=sample_rate, to_sr=16000)
        audio = resample_audio(audio, sample_rate, 16000)
        sample_rate = 16000
    
    # Denoise
    enhanced_audio = model.enhance(audio, sample_rate)
    
    return enhanced_audio, sample_rate


def separate_sources(audio: np.ndarray, sample_rate: int, model: DemucsModel) -> dict:
    """
    Step 2: Separate audio into sources using Demucs.
    
    Args:
        audio: Input audio array
        sample_rate: Sample rate of audio
        model: Demucs model instance
        
    Returns:
        Dictionary with separated sources
    """
    logger.info("step_2_separate_start")
    
    # Ensure model is loaded
    if not model.is_loaded:
        logger.info("loading_demucs")
        model.load()
    
    # Demucs typically works with 44100Hz
    if sample_rate != 44100:
        logger.info("resampling_for_demucs", from_sr=sample_rate, to_sr=44100)
        audio = resample_audio(audio, sample_rate, 44100)
        sample_rate = 44100
    
    # Separate sources
    separated = model.separate(audio, sample_rate)
    
    return separated, sample_rate


def recombine_and_enhance(separated: dict, original_sample_rate: int) -> np.ndarray:
    """
    Step 3: Recombine separated sources and enhance.
    
    Args:
        separated: Dictionary with separated sources
        original_sample_rate: Original sample rate
        
    Returns:
        Recombined and enhanced audio array
    """
    logger.info("step_3_recombine")
    
    # Recombine sources with emphasis on cleaner sources
    # Weight vocals and other instruments more heavily
    vocals = separated.get("vocals", np.zeros_like(separated.get("drums", [])))
    drums = separated.get("drums", np.zeros_like(vocals))
    bass = separated.get("bass", np.zeros_like(vocals))
    other = separated.get("other", np.zeros_like(vocals))
    
    # Ensure all sources have the same length
    min_length = min(len(vocals), len(drums), len(bass), len(other))
    vocals = vocals[:min_length]
    drums = drums[:min_length]
    bass = bass[:min_length]
    other = other[:min_length]
    
    # Recombine with weights (can be adjusted based on preferences)
    weights = {
        "vocals": 1.2,  # Emphasize vocals
        "drums": 0.9,
        "bass": 1.0,
        "other": 0.8,
    }
    
    recombined = (
        weights["vocals"] * vocals +
        weights["drums"] * drums +
        weights["bass"] * bass +
        weights["other"] * other
    )
    
    # Normalize to prevent clipping
    max_val = np.abs(recombined).max()
    if max_val > 0:
        recombined = recombined / max_val * 0.95  # Leave headroom
    
    return recombined


def normalize_loudness(audio: np.ndarray, sample_rate: int, target_lufs: float = -16.0) -> np.ndarray:
    """
    Step 4: Normalize audio using loudness leveling.
    
    Uses pyloudnorm for EBU R128 loudness normalization.
    
    Args:
        audio: Input audio array
        sample_rate: Sample rate of audio
        target_lufs: Target loudness in LUFS (default: -16.0, broadcast standard)
        
    Returns:
        Normalized audio array
    """
    logger.info("step_4_normalize", target_lufs=target_lufs)
    
    try:
        import pyloudnorm as pyln
        
        # Create meter for measuring loudness
        meter = pyln.Meter(sample_rate)
        
        # Measure current loudness
        loudness = meter.integrated_loudness(audio)
        
        if np.isnan(loudness) or loudness == float('-inf'):
            logger.warning("loudness_measurement_failed_skip")
            return audio
        
        logger.info("loudness_measurement", current=float(loudness), target=target_lufs)
        
        # Normalize to target loudness
        normalized = pyln.normalize.loudness(audio, loudness, target_lufs)
        
        # Ensure no clipping
        max_val = np.abs(normalized).max()
        if max_val > 0.95:
            normalized = normalized / max_val * 0.95
        
        return normalized
        
    except ImportError:
        logger.warning("pyloudnorm_missing_basic_normalize")
        # Fallback to RMS normalization
        return normalize_audio(audio)


def main():
    """Main pipeline function."""
    parser = argparse.ArgumentParser(description='Audio Repair Pipeline')
    parser.add_argument('input_path', type=str, help='Path to input audio file')
    parser.add_argument('output_path', type=str, help='Path to output audio file')
    
    args = parser.parse_args()
    
    input_path = Path(args.input_path)
    output_path = Path(args.output_path)
    
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
        
        # Step 1: Denoise
        denoised_audio, sample_rate = denoise_audio(audio, sample_rate, deepfilternet)
        
        # Step 2: Source separation
        separated, sample_rate = separate_sources(denoised_audio, sample_rate, demucs)
        
        # Step 3: Recombine and enhance
        enhanced_audio = recombine_and_enhance(separated, sample_rate)
        
        # Resample back to original if needed
        if sample_rate != original_sample_rate:
            logger.info("resample_to_original", sample_rate=original_sample_rate)
            enhanced_audio = resample_audio(enhanced_audio, sample_rate, original_sample_rate)
            sample_rate = original_sample_rate
        
        # Step 4: Normalize loudness
        normalized_audio = normalize_loudness(enhanced_audio, sample_rate)
        
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Step 5: Export cleaned file
        logger.info("exporting", output_path=str(output_path))
        sf.write(str(output_path), normalized_audio, sample_rate)
        
        logger.info("pipeline_completed", output_path=str(output_path))
        
    except Exception as e:
        logger.exception("pipeline_failed", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()

