"""
Job schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class StageInfo(BaseModel):
    name: str
    status: str
    duration_ms: Optional[int] = None


class ProgressInfo(BaseModel):
    stage: Optional[str] = None
    percent_complete: int
    current_operation: Optional[str] = None
    stages: Optional[list[StageInfo]] = None


class Stems(BaseModel):
    vocals: Optional[str] = None
    drums: Optional[str] = None
    bass: Optional[str] = None
    other: Optional[str] = None


class DownloadResult(BaseModel):
    download_url: str
    signed_url: str
    file_size: int
    duration: float
    stems: Optional[Stems] = None


class ErrorInfo(BaseModel):
    code: str
    message: str
    retryable: bool
    retry_after: Optional[int] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: Optional[ProgressInfo] = None
    result: Optional[DownloadResult] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[ErrorInfo] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class JobResponse(BaseModel):
    id: UUID
    job_type: str
    status: str
    progress_percent: int
    progress_message: Optional[str] = None
    audio_file_id: UUID
    result_file_id: Optional[UUID] = None
    params: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobCreate(BaseModel):
    audio_file_id: UUID
    job_type: str
    params: Optional[Dict[str, Any]] = None


