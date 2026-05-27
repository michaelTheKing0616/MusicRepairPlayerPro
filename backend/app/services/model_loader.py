"""
Model loading and caching service
"""
import os
import torch
from pathlib import Path
from typing import Optional, Dict, Any
import structlog
from app.core.config import settings

logger = structlog.get_logger()


class ModelLoader:
    """Service for loading and caching AI models"""
    
    def __init__(self):
        self.cache_dir = Path(settings.MODEL_CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.loaded_models: Dict[str, Any] = {}
        self.device = torch.device(settings.GPU_DEVICE if settings.GPU_ENABLED and torch.cuda.is_available() else "cpu")
    
    def load_demucs(self, model_name: str = None) -> Any:
        """Load Demucs model with caching"""
        model_name = model_name or settings.DEMUCS_MODEL
        cache_key = f"demucs_{model_name}"
        
        if cache_key in self.loaded_models:
            return self.loaded_models[cache_key]
        
        try:
            from demucs.pretrained import get_model
            
            logger.info("Loading Demucs model", model=model_name)
            model = get_model(model_name)
            model.to(self.device)
            model.eval()
            
            self.loaded_models[cache_key] = model
            logger.info("Demucs model loaded", model=model_name)
            return model
            
        except ImportError:
            logger.warning("Demucs not installed")
            return None
        except Exception as e:
            logger.error("Failed to load Demucs model", error=str(e))
            raise
    
    def load_whisperx(self, model_name: str = None) -> Any:
        """Load WhisperX model with caching"""
        model_name = model_name or settings.WHISPER_MODEL
        cache_key = f"whisperx_{model_name}"
        
        if cache_key in self.loaded_models:
            return self.loaded_models[cache_key]
        
        try:
            import whisperx
            
            logger.info("Loading WhisperX model", model=model_name)
            model = whisperx.load_model(
                model_name,
                device=settings.WHISPER_DEVICE,
                compute_type=settings.WHISPER_COMPUTE_TYPE,
            )
            
            self.loaded_models[cache_key] = model
            logger.info("WhisperX model loaded", model=model_name)
            return model
            
        except ImportError:
            logger.warning("WhisperX not installed")
            return None
        except Exception as e:
            logger.error("Failed to load WhisperX model", error=str(e))
            raise
    
    def load_freevc(self, preset_name: str) -> Optional[Dict[str, Any]]:
        """Load FreeVC model and preset"""
        cache_key = f"freevc_{preset_name}"
        
        if cache_key in self.loaded_models:
            return self.loaded_models[cache_key]
        
        try:
            # FreeVC loading would go here
            # This is a placeholder
            logger.info("Loading FreeVC preset", preset=preset_name)
            
            # TODO: Implement actual FreeVC model loading
            # 1. Load model checkpoint
            # 2. Load preset embeddings
            # 3. Return model and config
            
            preset_path = Path(settings.FREEVC_MODEL_DIR) / f"{preset_name}.pth"
            if not preset_path.exists():
                logger.warning("FreeVC preset not found", preset=preset_name)
                return None
            
            # Placeholder
            model_config = {
                "preset_name": preset_name,
                "model_path": str(preset_path),
            }
            
            self.loaded_models[cache_key] = model_config
            return model_config
            
        except Exception as e:
            logger.error("Failed to load FreeVC preset", preset=preset_name, error=str(e))
            return None
    
    def load_hifigan(self) -> Optional[Any]:
        """Load HiFi-GAN vocoder"""
        cache_key = "hifigan"
        
        if cache_key in self.loaded_models:
            return self.loaded_models[cache_key]
        
        try:
            # HiFi-GAN loading would go here
            logger.info("Loading HiFi-GAN vocoder")
            
            # TODO: Implement actual HiFi-GAN loading
            # model_path = Path(settings.HIFIGAN_MODEL_PATH)
            # model = load_hifigan_model(model_path)
            
            # Placeholder
            self.loaded_models[cache_key] = None
            return None
            
        except Exception as e:
            logger.error("Failed to load HiFi-GAN", error=str(e))
            return None
    
    def clear_cache(self, model_type: Optional[str] = None):
        """Clear model cache"""
        if model_type:
            keys_to_remove = [k for k in self.loaded_models.keys() if k.startswith(model_type)]
            for key in keys_to_remove:
                del self.loaded_models[key]
        else:
            self.loaded_models.clear()
        
        logger.info("Model cache cleared", model_type=model_type or "all")


# Global model loader instance
model_loader = ModelLoader()

