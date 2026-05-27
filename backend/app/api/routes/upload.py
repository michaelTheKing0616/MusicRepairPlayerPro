"""
Audio upload routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import uuid
import os
from io import BytesIO
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.audio_file import AudioFile, FileStatus
from app.models.job import Job, JobStatus as JobRowStatus
from app.schemas.audio import (
    UploadResponse,
    FileInfo,
    AudioFileResponse,
    RepairAudioRequestBody,
    RepairEnqueueResponse,
    PresetRenderRequestBody,
    PresetRenderEnqueueResponse,
    StreamUrlResponse,
)
from app.schemas.experience import AudioAnalysisResponse
from app.services.audio_analysis import analyze_audio_bytes
from app.presets.catalog import preset_by_id
from app.services.storage import storage_service
from app.core.config import settings
from app.tasks.repair_tasks import process_repair_task
from app.tasks.preset_render_tasks import process_preset_render_task
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/audio", tags=["audio"])


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_audio(
    file: UploadFile = File(...),
    metadata: str = Form(None),  # JSON string with file metadata
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload audio file"""
    # Check file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes",
        )
    
    # Validate file format
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File format not allowed. Allowed formats: {', '.join(settings.ALLOWED_AUDIO_FORMATS)}",
        )
    
    # Check user consent
    if not user.consent_audio_processing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Audio processing consent required. Please provide consent first.",
        )
    
    # Generate unique file ID and storage path
    file_id = uuid.uuid4()
    storage_path = f"{user.id}/{file_id}{file_ext}"
    
    # Upload to storage
    file_stream = BytesIO(file_content)
    storage_service.upload_file(
        bucket=settings.BUCKET_RAW_AUDIO,
        object_name=storage_path,
        file_data=file_stream,
        content_type=file.content_type or "audio/wav",
        length=file_size,
    )
    
    # Parse metadata if provided
    import json
    metadata_dict = {}
    if metadata:
        try:
            metadata_dict = json.loads(metadata)
        except json.JSONDecodeError:
            pass
    
    # Create database record
    audio_file = AudioFile(
        id=file_id,
        user_id=user.id,
        filename=file.filename or f"audio{file_ext}",
        original_filename=file.filename or f"audio{file_ext}",
        file_size=file_size,
        duration=metadata_dict.get("duration"),
        sample_rate=metadata_dict.get("sample_rate"),
        channels=metadata_dict.get("channels"),
        format=file_ext[1:] if file_ext else None,
        storage_path=storage_path,
        storage_bucket=settings.BUCKET_RAW_AUDIO,
        status=FileStatus.UPLOADED,
    )
    
    db.add(audio_file)
    
    # Create job record
    job = Job(
        user_id=user.id,
        audio_file_id=audio_file.id,
        job_type="upload",
        status=JobRowStatus.COMPLETED,  # Upload is immediate
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(audio_file)
    
    logger.info(
        "Audio file uploaded",
        user_id=str(user.id),
        file_id=str(file_id),
        file_size=file_size,
    )
    
    # Generate upload URL for chunked uploads (if needed)
    upload_url = f"/api/v1/audio/uploads/{file_id}"
    resume_url = f"/api/v1/audio/uploads/{file_id}/resume"
    
    return UploadResponse(
        job_id=str(job.id),
        status="uploaded",
        file_info=FileInfo(
            id=audio_file.id,
            filename=audio_file.filename,
            duration=audio_file.duration or 0.0,
            sample_rate=audio_file.sample_rate or 44100,
            channels=audio_file.channels or 2,
            file_size=audio_file.file_size,
            uploaded_at=audio_file.created_at,
        ),
        upload_url=upload_url,
        chunk_size=settings.CHUNK_SIZE,
        resume_url=resume_url,
    )


@router.post("/uploads/{file_id}/chunk")
async def upload_chunk(
    file_id: uuid.UUID,
    chunk: UploadFile = File(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    total_size: int = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a chunk of a file (for resumable uploads)"""
    # Verify file belongs to user
    result = await db.execute(
        select(AudioFile).where(
            AudioFile.id == file_id,
            AudioFile.user_id == user.id,
        )
    )
    audio_file = result.scalar_one_or_none()
    
    if not audio_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    # Upload chunk to temp storage
    chunk_data = await chunk.read()
    storage_service.upload_chunk(
        bucket=settings.BUCKET_TEMP,
        object_name=str(file_id),
        chunk_data=chunk_data,
        chunk_index=chunk_index,
        total_chunks=total_chunks,
        total_size=total_size,
    )
    
    logger.info(
        "Chunk uploaded",
        file_id=str(file_id),
        chunk_index=chunk_index,
        total_chunks=total_chunks,
    )
    
    return {"status": "chunk_uploaded", "chunk_index": chunk_index}


def _audio_to_response(row: AudioFile) -> AudioFileResponse:
    st = row.status.value if isinstance(row.status, FileStatus) else str(row.status)
    return AudioFileResponse(
        id=row.id,
        filename=row.filename,
        original_filename=row.original_filename,
        file_size=row.file_size,
        duration=row.duration,
        sample_rate=row.sample_rate,
        channels=row.channels,
        format=row.format,
        status=st,
        created_at=row.created_at,
    )


@router.get("/files", response_model=List[AudioFileResponse])
async def list_audio_files(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List audio files owned by the current user."""
    res = await db.execute(
        select(AudioFile)
        .where(AudioFile.user_id == user.id)
        .order_by(AudioFile.created_at.desc())
    )
    rows = res.scalars().all()
    return [_audio_to_response(r) for r in rows]


@router.get("/files/{file_id}", response_model=AudioFileResponse)
async def get_audio_file(
    file_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(AudioFile).where(AudioFile.id == file_id, AudioFile.user_id == user.id)
    )
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return _audio_to_response(row)


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audio_file(
    file_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(AudioFile).where(AudioFile.id == file_id, AudioFile.user_id == user.id)
    )
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    try:
        storage_service.delete_file(row.storage_bucket, row.storage_path)
    except Exception as exc:
        logger.warning("storage delete failed", file_id=str(file_id), error=str(exc))
    db.delete(row)
    await db.commit()


@router.get("/files/{file_id}/stream-url", response_model=StreamUrlResponse)
async def get_audio_stream_url(
    file_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Time-limited direct URL for players (TrackPlayer, ExoPlayer, etc.)."""
    res = await db.execute(
        select(AudioFile).where(AudioFile.id == file_id, AudioFile.user_id == user.id)
    )
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    url = storage_service.get_presigned_url(
        bucket=row.storage_bucket,
        object_name=row.storage_path,
        expiry_seconds=settings.SIGNED_URL_EXPIRY_SECONDS,
    )
    return StreamUrlResponse(
        url=url,
        expires_in_seconds=settings.SIGNED_URL_EXPIRY_SECONDS,
        file_id=row.id,
    )


@router.post("/{audio_id}/analyze", response_model=AudioAnalysisResponse)
async def analyze_uploaded_audio(
    audio_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Feature extraction + deterministic damage-style hints (reads object from storage)."""
    if not user.consent_audio_processing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Audio processing consent required.",
        )
    res = await db.execute(
        select(AudioFile).where(AudioFile.id == audio_id, AudioFile.user_id == user.id)
    )
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    data = storage_service.download_file(row.storage_bucket, row.storage_path)
    stats = analyze_audio_bytes(data)
    return AudioAnalysisResponse(
        audio_file_id=row.id,
        duration_sec=stats["duration_sec"],
        sample_rate=stats["sample_rate"],
        channels=stats["channels"],
        peak=stats["peak"],
        rms=stats["rms"],
        clipping_ratio=stats["clipping_ratio"],
        zero_crossing_rate=stats["zero_crossing_rate"],
        spectral_centroid_hz_mean=stats["spectral_centroid_hz_mean"],
        damage_hints=stats["damage_hints"],
    )


@router.post("/repair", response_model=RepairEnqueueResponse, status_code=status.HTTP_202_ACCEPTED)
async def enqueue_repair(
    body: RepairAudioRequestBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Queue FFmpeg-based repair job; poll `GET /jobs/{id}/status` for progress.

    Note: `modelType` values are treated as named profiles for the DSP chain on the worker host.
    """
    if not user.consent_audio_processing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Audio processing consent required.",
        )
    model = body.model_type.lower()
    if model not in ("deepfilternet", "demucs", "uvr"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="modelType must be deepfilternet, demucs, or uvr",
        )

    res = await db.execute(
        select(AudioFile).where(
            AudioFile.id == body.audio_file_id,
            AudioFile.user_id == user.id,
        )
    )
    src = res.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found")

    job = Job(
        user_id=user.id,
        audio_file_id=src.id,
        job_type="repair",
        status=JobRowStatus.QUEUED,
        progress_percent=0,
        progress_message="Queued",
        params={
            "modelType": model,
            "enhancementSettings": body.enhancement_settings or {},
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        task = process_repair_task.delay(str(job.id))
        job.celery_task_id = task.id
        await db.commit()
    except Exception as exc:
        logger.error("failed to queue repair", job_id=str(job.id), error=str(exc))
        job.status = JobRowStatus.FAILED
        job.error_code = "queue_unavailable"
        job.error_message = (
            "Could not queue repair job. Ensure Redis and a Celery worker are running."
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=job.error_message,
        ) from exc

    logger.info("repair queued", job_id=str(job.id), user_id=str(user.id), model=model)
    return RepairEnqueueResponse(
        id=str(job.id),
        audioFileId=str(src.id),
        modelType=model,
        status="queued",
    )


@router.post(
    "/preset-render",
    response_model=PresetRenderEnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def enqueue_preset_render(
    body: PresetRenderRequestBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.consent_audio_processing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Audio processing consent required.",
        )
    if not preset_by_id(body.preset_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown presetId",
        )
    res = await db.execute(
        select(AudioFile).where(
            AudioFile.id == body.audio_file_id,
            AudioFile.user_id == user.id,
        )
    )
    src = res.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found")

    job = Job(
        user_id=user.id,
        audio_file_id=src.id,
        job_type="preset_render",
        status=JobRowStatus.QUEUED,
        progress_percent=0,
        progress_message="Queued",
        params={"presetId": body.preset_id},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        task = process_preset_render_task.delay(str(job.id))
        job.celery_task_id = task.id
        await db.commit()
    except Exception as exc:
        logger.error("failed to queue preset_render", job_id=str(job.id), error=str(exc))
        job.status = JobRowStatus.FAILED
        job.error_code = "queue_unavailable"
        job.error_message = (
            "Could not queue preset render. Ensure Redis and a Celery worker are running."
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=job.error_message,
        ) from exc

    return PresetRenderEnqueueResponse(
        id=str(job.id),
        audioFileId=str(src.id),
        presetId=body.preset_id,
        status="queued",
    )


