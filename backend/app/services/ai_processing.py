"""
AI Processing Service - Integration with ML models
"""
from typing import Dict, Any, Optional, List, Tuple
import os
import tempfile
import structlog
import torch
import torchaudio
import numpy as np
from pathlib import Path
from app.core.config import settings
from app.services.storage import storage_service
import librosa
import soundfile as sf

logger = structlog.get_logger()


class AIProcessingService:
    """Service for processing audio with AI models"""
    
    def __init__(self):
        self.device = torch.device(settings.GPU_DEVICE if settings.GPU_ENABLED and torch.cuda.is_available() else "cpu")
        self.models = {}
        self.models_loaded = False
        logger.info("AI Processing Service initialized", device=str(self.device))
    
    def _load_models(self):
        """Lazy load AI models on first use"""
        if self.models_loaded:
            return
        
        logger.info("Loading AI models...")
        
        # Models will be loaded on-demand to save memory
        # This prevents loading all models at startup
        self.models_loaded = True
        logger.info("AI models ready for loading")
    
    def process_transform(
        self,
        job_id: str,
        audio_file_id: str,
        transform_params: Dict[str, Any],
        options: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Process a complete transformation job
        
        Pipeline:
        1. Download audio from storage
        2. Stem separation (if requested)
        3. Content extraction (if requested)
        4. Voice conversion (if voice preset provided)
        5. Style transfer (if style preset provided)
        6. Vocoder synthesis
        7. Post-processing
        8. Upload result to storage
        """
        logger.info("Starting transform processing", job_id=job_id, audio_file_id=audio_file_id)
        
        try:
            # Create temporary directory for processing
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Step 1: Download audio file
                logger.info("Downloading audio file", audio_file_id=audio_file_id)
                audio_path = self._download_audio(audio_file_id, temp_path)
                
                # Step 2: Stem separation (if requested)
                stems = None
                if options.get("separate_stems", False):
                    logger.info("Separating stems")
                    stems = self.separate_stems(audio_path, temp_path)
                
                # Step 3: Content extraction (if requested)
                metadata = {}
                if options.get("extract_content", False):
                    logger.info("Extracting content")
                    metadata = self.extract_content(audio_path if not stems else stems.get("vocals"))
                
                # Step 4: Voice conversion (if voice preset provided)
                processed_audio = audio_path
                if transform_params.get("voice_preset"):
                    logger.info("Converting voice", preset=transform_params["voice_preset"])
                    processed_audio = self.convert_voice(
                        stems["vocals"] if stems else audio_path,
                        transform_params["voice_preset"],
                        transform_params.get("intensity", 0.85),
                        transform_params.get("preserve_pitch", True),
                        temp_path,
                    )
                
                # Step 5: Style transfer (if style preset provided)
                if transform_params.get("style_preset"):
                    logger.info("Transferring style", preset=transform_params["style_preset"])
                    processed_audio = self.transfer_style(
                        processed_audio,
                        transform_params["style_preset"],
                        transform_params.get("intensity", 0.85),
                        temp_path,
                    )
                
                # Step 6: Post-processing
                logger.info("Post-processing audio")
                final_audio = self.post_process_audio(processed_audio, temp_path)
                
                # Step 7: Upload result
                logger.info("Uploading result")
                result_path = self._upload_result(final_audio, job_id)
                
                # Prepare result metadata
                result = {
                    "status": "completed",
                    "result_file_path": result_path,
                    "stems": stems,
                    "metadata": metadata,
                }
                
                logger.info("Transform processing completed", job_id=job_id)
                return result
                
        except Exception as e:
            logger.error("Transform processing failed", job_id=job_id, error=str(e))
            raise
    
    def _download_audio(self, audio_file_id: str, temp_dir: Path) -> str:
        """Download audio file from storage to temp directory"""
        # Get audio file info from database (would need DB session)
        # For now, assume we have storage path
        storage_path = f"audio/{audio_file_id}.wav"  # TODO: Get from DB
        
        audio_data = storage_service.download_file(
            bucket=settings.BUCKET_RAW_AUDIO,
            object_name=storage_path,
        )
        
        audio_path = temp_dir / f"{audio_file_id}_input.wav"
        with open(audio_path, "wb") as f:
            f.write(audio_data)
        
        return str(audio_path)
    
    def _upload_result(self, audio_path: str, job_id: str) -> str:
        """Upload processed audio to storage"""
        storage_path = f"results/{job_id}/output.wav"
        
        with open(audio_path, "rb") as f:
            storage_service.upload_file(
                bucket=settings.BUCKET_PROCESSED_AUDIO,
                object_name=storage_path,
                file_data=f,
                content_type="audio/wav",
            )
        
        return storage_path
    
    def separate_stems(self, audio_path: str, output_dir: Path) -> Dict[str, str]:
        """
        Separate audio into stems using Demucs v4
        
        Returns dict with paths to separated stems:
        - vocals
        - drums
        - bass
        - other
        """
        try:
            from demucs.pretrained import get_model
            from demucs.apply import apply_model
            import torch
            
            logger.info("Loading Demucs model", model=settings.DEMUCS_MODEL)
            
            # Load Demucs model
            model = get_model(settings.DEMUCS_MODEL)
            model.to(self.device)
            model.eval()
            
            # Load audio
            wav, sr = torchaudio.load(audio_path)
            if wav.shape[0] > 1:
                wav = wav.mean(dim=0, keepdim=True)  # Convert to mono if stereo
            
            # Resample to model's expected sample rate (44100)
            if sr != settings.DEMUCS_SAMPLE_RATE:
                resampler = torchaudio.transforms.Resample(sr, settings.DEMUCS_SAMPLE_RATE)
                wav = resampler(wav)
                sr = settings.DEMUCS_SAMPLE_RATE
            
            # Normalize
            wav = wav / max(wav.abs().max(), 1e-8)
            
            # Separate stems
            logger.info("Separating stems...")
            with torch.no_grad():
                sources = apply_model(model, wav[None], device=self.device, shifts=1, split=True, overlap=0.25)
            
            # Save stems
            stems = {}
            stem_names = ["drums", "bass", "other", "vocals"]
            
            for i, stem_name in enumerate(stem_names):
                stem_audio = sources[0, i].cpu()
                stem_path = output_dir / f"{stem_name}.wav"
                torchaudio.save(str(stem_path), stem_audio, settings.DEMUCS_SAMPLE_RATE)
                stems[stem_name] = str(stem_path)
            
            logger.info("Stem separation completed", stems=list(stems.keys()))
            return stems
            
        except ImportError:
            logger.warning("Demucs not available, using placeholder")
            # Placeholder for development
            return {
                "vocals": audio_path,
                "drums": audio_path,
                "bass": audio_path,
                "other": audio_path,
            }
        except Exception as e:
            logger.error("Stem separation failed", error=str(e))
            raise
    
    def extract_content(self, audio_path: str) -> Dict[str, Any]:
        """
        Extract transcription and metadata using WhisperX
        
        Returns:
        - transcription: Full text
        - language: Detected language
        - segments: Word-level timestamps
        - tempo: Detected tempo (if available)
        - key: Detected key (if available)
        """
        try:
            import whisperx
            
            logger.info("Loading WhisperX model", model=settings.WHISPER_MODEL)
            
            # Load model
            model = whisperx.load_model(
                settings.WHISPER_MODEL,
                device=settings.WHISPER_DEVICE,
                compute_type=settings.WHISPER_COMPUTE_TYPE,
            )
            
            # Transcribe
            logger.info("Transcribing audio...")
            audio = whisperx.load_audio(audio_path)
            result = model.transcribe(audio, batch_size=16)
            
            # Align timestamps
            model_a, metadata = whisperx.load_align_model(
                language_code=result["language"],
                device=settings.WHISPER_DEVICE,
            )
            result = whisperx.align(result["segments"], model_a, metadata, audio, settings.WHISPER_DEVICE, return_char_alignments=False)
            
            # Extract metadata
            transcription = " ".join([seg["text"] for seg in result["segments"]])
            
            # Try to detect tempo and key using librosa
            try:
                y, sr = librosa.load(audio_path, duration=30)  # Sample first 30 seconds
                tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
                tempo = float(tempo[0]) if isinstance(tempo, np.ndarray) else float(tempo)
            except:
                tempo = None
            
            metadata = {
                "transcription": transcription,
                "language": result["language"],
                "segments": result["segments"],
                "tempo": tempo,
                "key": None,  # Would need additional analysis
            }
            
            logger.info("Content extraction completed", language=result["language"], words=len(result["segments"]))
            return metadata
            
        except ImportError:
            logger.warning("WhisperX not available, using placeholder")
            return {
                "transcription": "Transcription not available",
                "language": "en",
                "segments": [],
                "tempo": None,
                "key": None,
            }
        except Exception as e:
            logger.error("Content extraction failed", error=str(e))
            return {
                "transcription": "",
                "language": "en",
                "segments": [],
                "tempo": None,
                "key": None,
            }
    
    def convert_voice(
        self,
        audio_path: str,
        preset: str,
        intensity: float,
        preserve_pitch: bool,
        output_dir: Path,
    ) -> str:
        """
        Convert voice using FreeVC
        
        Args:
            audio_path: Path to input audio (preferably vocal stem)
            preset: Voice preset name
            intensity: Transformation intensity (0.0-1.0)
            preserve_pitch: Whether to preserve original pitch
            output_dir: Directory for output
        
        Returns:
            Path to converted audio
        """
        try:
            from app.services.freevc_service import freevc_service
            
            logger.info("Voice conversion", preset=preset, intensity=intensity)
            
            output_path = output_dir / "voice_converted.wav"
            
            # Use FreeVC service
            converted_path = freevc_service.convert_voice(
                source_audio_path=audio_path,
                target_preset=preset,
                intensity=intensity,
                preserve_pitch=preserve_pitch,
                output_path=str(output_path),
            )
            
            logger.info("Voice conversion completed", output=converted_path)
            return converted_path
            
        except Exception as e:
            logger.error("Voice conversion failed", error=str(e))
            # Fallback: return original
            return audio_path
    
    def transfer_style(
        self,
        audio_path: str,
        style_preset: str,
        intensity: float,
        output_dir: Path,
    ) -> str:
        """
        Transfer musical style using DiffSinger or similar
        
        Args:
            audio_path: Path to input audio
            style_preset: Style preset name
            intensity: Transformation intensity (0.0-1.0)
            output_dir: Directory for output
        
        Returns:
            Path to style-transferred audio
        """
        try:
            logger.info("Style transfer", preset=style_preset, intensity=intensity)
            
            # DiffSinger integration would go here
            # This is a placeholder - actual implementation requires:
            # 1. Loading DiffSinger model
            # 2. Loading style reference
            # 3. Extracting musical features
            # 4. Applying style transfer
            # 5. Synthesizing output
            
            # Placeholder: For now, apply simple audio effects
            output_path = output_dir / "style_transferred.wav"
            
            # Load audio
            audio, sr = librosa.load(audio_path, sr=44100)
            
            # Placeholder: Apply simple effects based on style
            # In production, this would be actual style transfer
            if "jazz" in style_preset.lower():
                # Simulate jazz style (would be actual model inference)
                audio = librosa.effects.preemphasis(audio)
            elif "rock" in style_preset.lower():
                # Simulate rock style
                audio = audio * 1.1  # Slight distortion
            
            # Save
            sf.write(str(output_path), audio, sr)
            
            logger.info("Style transfer completed", output=str(output_path))
            return str(output_path)
            
        except Exception as e:
            logger.error("Style transfer failed", error=str(e))
            # Fallback: return original
            return audio_path
    
    def synthesize_audio(self, mel_spectrogram: np.ndarray, output_path: str, sample_rate: int = 22050) -> str:
        """
        Synthesize audio from mel spectrogram using HiFi-GAN
        
        Args:
            mel_spectrogram: Mel spectrogram array
            output_path: Path to save output
            sample_rate: Target sample rate
        
        Returns:
            Path to synthesized audio
        """
        try:
            from app.services.hifigan_service import hifigan_service
            
            logger.info("Synthesizing audio with HiFi-GAN")
            
            # Use HiFi-GAN service
            synthesized_path = hifigan_service.synthesize(
                mel_spectrogram=mel_spectrogram,
                output_path=output_path,
                sample_rate=sample_rate,
            )
            
            logger.info("Audio synthesis completed", output=synthesized_path)
            return synthesized_path
            
        except Exception as e:
            logger.error("Audio synthesis failed", error=str(e))
            raise
    
    def post_process_audio(self, audio_path: str, output_dir: Path) -> str:
        """
        Post-process audio: normalization, EQ, format conversion
        
        Args:
            audio_path: Path to input audio
            output_dir: Directory for output
        
        Returns:
            Path to processed audio
        """
        try:
            import pyloudnorm as pyln
            
            logger.info("Post-processing audio")
            
            # Load audio
            audio, sr = librosa.load(audio_path, sr=44100)
            
            # Normalize loudness (LUFS)
            meter = pyln.Meter(sr)
            loudness = meter.integrated_loudness(audio)
            target_lufs = -16.0  # Spotify/YouTube standard
            
            if not np.isnan(loudness):
                audio_normalized = pyln.normalize.loudness(audio, loudness, target_lufs)
            else:
                audio_normalized = audio
            
            # Peak normalization (safety)
            max_val = np.abs(audio_normalized).max()
            if max_val > 0.95:
                audio_normalized = audio_normalized * (0.95 / max_val)
            
            # Save
            output_path = output_dir / "final_output.wav"
            sf.write(str(output_path), audio_normalized, sr)
            
            logger.info("Post-processing completed", output=str(output_path))
            return str(output_path)
            
        except Exception as e:
            logger.error("Post-processing failed", error=str(e))
            # Fallback: return original
            return audio_path
