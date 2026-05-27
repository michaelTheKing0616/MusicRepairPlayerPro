"""
Application configuration settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Allow extra env vars in local `.env` (e.g. frontend/supabase keys) without breaking the API.
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # App Info
    APP_NAME: str = "MusicRepairApp API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/musicrepair"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage - MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_REGION: str = "us-east-1"

    # Storage - S3 (Alternative)
    USE_S3: bool = False
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "musicrepair-audio"

    # Storage Buckets
    BUCKET_RAW_AUDIO: str = "raw-audio"
    BUCKET_PROCESSED_AUDIO: str = "processed-audio"
    BUCKET_MODELS: str = "models"
    BUCKET_TEMP: str = "temp"

    # CDN
    CDN_BASE_URL: Optional[str] = None
    SIGNED_URL_EXPIRY_SECONDS: int = 3600  # 1 hour

    # File Upload
    MAX_UPLOAD_SIZE: int = 524288000  # 500 MB
    ALLOWED_AUDIO_FORMATS: list = [".wav", ".mp3", ".flac", ".m4a", ".ogg"]
    CHUNK_SIZE: int = 5242880  # 5 MB

    # Job Settings
    JOB_TIMEOUT_SECONDS: int = 600  # 10 minutes
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 5

    # AI Model Settings
    GPU_ENABLED: bool = True
    GPU_DEVICE: str = "cuda:0"
    MODEL_CACHE_DIR: str = "/models/cache"
    
    # Demucs Settings
    DEMUCS_MODEL: str = "htdemucs_ft"  # htdemucs, htdemucs_ft, mdx, mdx_extra
    DEMUCS_SAMPLE_RATE: int = 44100
    
    # WhisperX Settings
    WHISPER_MODEL: str = "large-v3"  # base, small, medium, large-v2, large-v3
    WHISPER_DEVICE: str = "cuda"
    WHISPER_COMPUTE_TYPE: str = "float16"
    
    # FreeVC Settings
    FREEVC_MODEL_DIR: str = "/models/freevc"
    FREEVC_CONFIG_PATH: str = "/models/freevc/config.json"
    FREEVC_SAMPLE_RATE: int = 16000
    
    # HiFi-GAN Settings
    HIFIGAN_MODEL_PATH: str = "/models/hifigan/generator_v1"
    HIFIGAN_SAMPLE_RATE: int = 22050
    
    # DiffSinger Settings (Style Transfer)
    DIFFSINGER_MODEL_DIR: str = "/models/diffsinger"
    DIFFSINGER_ENABLED: bool = False  # Optional feature

    # Processing Settings
    PROCESSING_BATCH_SIZE: int = 1
    DEFAULT_QUALITY: str = "high"  # preview, standard, high

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",  # Expo default
        "http://10.0.2.2:3000",  # Android emulator
        "http://10.0.2.2:8081",  # Android emulator alternative
        "exp://localhost:8081",  # Expo
        "*",  # Allow all in development (restrict in production!)
    ]

    # Logging
    LOG_LEVEL: str = "INFO"


settings = Settings()


