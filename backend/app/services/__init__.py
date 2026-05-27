"""Services"""
from app.services.storage import storage_service, StorageService
try:
    from app.services.freevc_service import freevc_service, FreeVCService  # type: ignore
except Exception:  # pragma: no cover
    freevc_service = None  # type: ignore
    FreeVCService = None  # type: ignore

try:
    from app.services.hifigan_service import hifigan_service, HiFiGANService  # type: ignore
except Exception:  # pragma: no cover
    hifigan_service = None  # type: ignore
    HiFiGANService = None  # type: ignore

# Optional heavy ML stack (torch/torchaudio). Avoid import-time failures in minimal/test envs.
try:
    from app.services.ai_processing import AIProcessingService  # type: ignore
except Exception:  # pragma: no cover
    AIProcessingService = None  # type: ignore

__all__ = [
    "storage_service",
    "StorageService",
    "AIProcessingService",
    "freevc_service",
    "FreeVCService",
    "hifigan_service",
    "HiFiGANService",
]


