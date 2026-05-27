"""
Audio file schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID


class AudioFileCreate(BaseModel):
    filename: str
    file_size: int
    duration: Optional[float] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    format: Optional[str] = None


class AudioFileResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    duration: Optional[float]
    sample_rate: Optional[int]
    channels: Optional[int]
    format: Optional[str]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileInfo(BaseModel):
    id: UUID
    filename: str
    duration: float
    sample_rate: int
    channels: int
    file_size: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadResponse(BaseModel):
    job_id: str
    status: str
    file_info: FileInfo
    upload_url: str
    chunk_size: int
    resume_url: str


class RepairAudioRequestBody(BaseModel):
    """Inbound JSON from mobile (`audioFileId`, camelCase aliases)."""

    model_config = ConfigDict(populate_by_name=True)

    audio_file_id: UUID = Field(..., alias="audioFileId")
    model_type: str = Field(..., alias="modelType")
    enhancement_settings: Optional[Dict[str, Any]] = Field(default=None, alias="enhancementSettings")


class RepairEnqueueResponse(BaseModel):
    """Returns `id` equal to Celery/async job UUID for polling `/jobs/{id}/status`."""

    id: str
    audioFileId: str
    modelType: str
    status: str


class PresetRenderRequestBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_file_id: UUID = Field(..., alias="audioFileId")
    preset_id: str = Field(..., alias="presetId")


class PresetRenderEnqueueResponse(BaseModel):
    id: str
    audioFileId: str
    presetId: str
    status: str


class StreamUrlResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    url: str
    expires_in_seconds: int = Field(alias="expiresInSeconds")
    file_id: UUID = Field(alias="fileId")

