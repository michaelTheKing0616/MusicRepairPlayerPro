"""
Transform routes for voice/style transformation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.audio_file import AudioFile
from app.models.job import Job, JobStatus
from app.models.transform_request import TransformRequest
from app.schemas.transform import TransformRequest as TransformRequestSchema, TransformResponse
from app.core.config import settings
from app.tasks.transform_tasks import process_transform_task
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/transform", tags=["transform"])


@router.post("", response_model=TransformResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_transform(
    transform_data: TransformRequestSchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Request audio transformation"""
    # Verify job exists and belongs to user
    result = await db.execute(
        select(Job).where(
            Job.id == transform_data.job_id,
            Job.user_id == user.id,
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    # Get audio file
    result = await db.execute(
        select(AudioFile).where(AudioFile.id == job.audio_file_id)
    )
    audio_file = result.scalar_one_or_none()
    
    if not audio_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found",
        )
    
    # Check voice cloning consent if needed
    if transform_data.transform_type in ["voice", "combined"] and transform_data.params.voice_preset:
        if not user.consent_voice_cloning:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Voice cloning consent required. Please provide consent first.",
            )
        if not user.age_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Age verification required for voice cloning features.",
            )
    
    # Create transform request
    transform_request = TransformRequest(
        job_id=job.id,
        user_id=user.id,
        transform_type=transform_data.transform_type,
        voice_preset=transform_data.params.voice_preset,
        style_preset=transform_data.params.style_preset,
        intensity=transform_data.params.intensity,
        preserve_pitch=transform_data.params.preserve_pitch,
        separate_stems=transform_data.options.separate_stems if transform_data.options else False,
        extract_content=transform_data.options.extract_content if transform_data.options else False,
        quality=transform_data.options.quality if transform_data.options else "high",
    )
    
    db.add(transform_request)
    
    # Update job
    job.job_type = "transform"
    job.status = JobStatus.QUEUED
    job.params = transform_data.dict()
    
    await db.commit()
    await db.refresh(transform_request)
    await db.refresh(job)
    
    # Queue Celery task
    try:
        from app.tasks.transform_tasks import process_transform_task
        task = process_transform_task.delay(str(job.id))
        job.celery_task_id = task.id
        await db.commit()
    except Exception as e:
        logger.error("Failed to queue transform task", error=str(e), job_id=str(job.id))
        job.status = JobStatus.FAILED
        job.error_message = f"Failed to queue task: {str(e)}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue transformation task",
        )
    
    # Estimate completion time (rough estimate: 2-3 minutes for 3-minute audio)
    estimated_duration = 120 if transform_data.options and transform_data.options.quality == "high" else 60
    estimated_completion = datetime.utcnow() + timedelta(seconds=estimated_duration)
    
    logger.info(
        "Transform requested",
        user_id=str(user.id),
        job_id=str(job.id),
        transform_type=transform_data.transform_type,
    )
    
    return TransformResponse(
        transform_id=transform_request.id,
        job_id=job.id,
        status="queued",
        estimated_completion=estimated_completion,
        status_url=f"/api/v1/jobs/{job.id}/status",
        queue_position=0,  # TODO: Get actual queue position from Celery
    )


