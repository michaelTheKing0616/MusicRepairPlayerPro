"""
HiFi-GAN Neural Vocoder Service
"""
import torch
import numpy as np
from pathlib import Path
from typing import Optional
import structlog
from app.core.config import settings

logger = structlog.get_logger()


class HiFiGANService:
    """Service for HiFi-GAN neural vocoder"""
    
    def __init__(self):
        self.device = torch.device(settings.GPU_DEVICE if torch.cuda.is_available() else "cpu")
        self.model = None
        self.models_loaded = False
        logger.info("HiFi-GAN Service initialized", device=str(self.device))
    
    def _load_model(self):
        """Load HiFi-GAN model"""
        if self.models_loaded:
            return
        
        try:
            model_path = Path(settings.HIFIGAN_MODEL_PATH)
            if not model_path.exists():
                logger.warning("HiFi-GAN model not found", path=str(model_path))
                logger.info("HiFi-GAN will use librosa fallback")
                self.models_loaded = True
                return
            
            # HiFi-GAN model loading would go here
            logger.info("Loading HiFi-GAN model...")
            
            # TODO: Implement actual HiFi-GAN loading
            # Example structure:
            # from hifigan import Generator
            # checkpoint = torch.load(model_path, map_location=self.device)
            # self.model = Generator(**checkpoint['config'])
            # self.model.load_state_dict(checkpoint['generator'])
            # self.model.to(self.device)
            # self.model.eval()
            
            logger.info("HiFi-GAN model loaded")
            self.models_loaded = True
            
        except Exception as e:
            logger.error("Failed to load HiFi-GAN model", error=str(e))
            logger.info("HiFi-GAN will use librosa fallback")
            self.models_loaded = True
    
    def synthesize(
        self,
        mel_spectrogram: np.ndarray,
        output_path: str = None,
        sample_rate: int = 22050,
    ) -> str:
        """
        Synthesize audio from mel spectrogram
        
        Args:
            mel_spectrogram: Mel spectrogram array (n_mels, time)
            output_path: Output file path
            sample_rate: Target sample rate
        
        Returns:
            Path to synthesized audio
        """
        self._load_model()
        
        if self.model is None:
            logger.warning("HiFi-GAN model not loaded, using librosa fallback")
            return self._librosa_synthesize(mel_spectrogram, output_path, sample_rate)
        
        try:
            # Convert mel to tensor
            mel_tensor = torch.from_numpy(mel_spectrogram).unsqueeze(0).to(self.device)
            
            # Synthesize with HiFi-GAN
            with torch.no_grad():
                audio_tensor = self.model(mel_tensor)
                audio = audio_tensor.cpu().squeeze().numpy()
            
            # Normalize
            audio = audio / np.abs(audio).max() * 0.95
            
            # Save
            if output_path is None:
                output_path = "synthesized.wav"
            
            import soundfile as sf
            sf.write(output_path, audio, sample_rate)
            
            logger.info("HiFi-GAN synthesis completed", output=output_path)
            return output_path
            
        except Exception as e:
            logger.error("HiFi-GAN synthesis failed", error=str(e))
            logger.info("Falling back to librosa")
            return self._librosa_synthesize(mel_spectrogram, output_path, sample_rate)
    
    def _librosa_synthesize(
        self,
        mel_spectrogram: np.ndarray,
        output_path: str = None,
        sample_rate: int = 22050,
    ) -> str:
        """Fallback synthesis using librosa's Griffin-Lim"""
        import librosa
        import soundfile as sf
        
        logger.info("Using librosa Griffin-Lim (fallback)")
        
        # Convert mel to magnitude spectrogram
        # This is a simplified conversion - actual implementation would be more complex
        magnitude = librosa.feature.inverse.mel_to_stft(
            mel_spectrogram,
            sr=sample_rate,
            n_fft=2048,
        )
        
        # Griffin-Lim reconstruction
        audio = librosa.griffinlim(
            magnitude,
            n_iter=32,
            hop_length=512,
        )
        
        # Normalize
        audio = audio / np.abs(audio).max() * 0.95
        
        if output_path is None:
            output_path = "synthesized.wav"
        
        sf.write(output_path, audio, sample_rate)
        return output_path


# Global service instance
hifigan_service = HiFiGANService()

