"""
Transform request/response schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class TransformParams(BaseModel):
    voice_preset: Optional[str] = None
    style_preset: Optional[str] = None
    intensity: float = 0.85  # 0.0 - 1.0
    preserve_pitch: bool = True


class TransformOptions(BaseModel):
    separate_stems: bool = False
    extract_content: bool = False
    quality: str = "high"  # preview, standard, high


class TransformRequest(BaseModel):
    job_id: UUID
    transform_type: str  # voice, style, combined
    params: TransformParams
    options: Optional[TransformOptions] = None


class TransformResponse(BaseModel):
    transform_id: UUID
    job_id: UUID
    status: str
    estimated_completion: datetime
    status_url: str
    queue_position: int


