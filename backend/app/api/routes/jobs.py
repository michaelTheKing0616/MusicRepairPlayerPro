"""
Job status and management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.job import Job, JobStatus, JobStage
from app.models.audio_file import AudioFile
from app.schemas.job import JobStatusResponse, ProgressInfo, StageInfo, DownloadResult, Stems, ErrorInfo
from app.schemas.job import JobResponse
from app.services.storage import storage_service
from app.core.config import settings
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/jobs", tags=["jobs"])


def _repair_stage_list(job: Job) -> list[StageInfo]:
    """Derive FFmpeg-repair stages from persisted progress_percent."""
    p = job.progress_percent or 0
    return [
        StageInfo(name="download", status="completed" if p >= 20 else ("in_progress" if p > 0 else "pending")),
        StageInfo(
            name="ffmpeg_repair",
            status="completed" if p >= 70 else ("in_progress" if 20 <= p < 70 else "pending"),
        ),
        StageInfo(name="upload", status="completed" if p >= 100 else ("in_progress" if p >= 70 else "pending")),
    ]


def _preset_render_stage_list(job: Job) -> list[StageInfo]:
    p = job.progress_percent or 0
    return [
        StageInfo(name="download", status="completed" if p >= 20 else ("in_progress" if p > 0 else "pending")),
        StageInfo(
            name="ffmpeg_preset",
            status="completed" if p >= 70 else ("in_progress" if 20 <= p < 70 else "pending"),
        ),
        StageInfo(name="upload", status="completed" if p >= 100 else ("in_progress" if p >= 70 else "pending")),
    ]


def _clip_render_stage_list(job: Job) -> list[StageInfo]:
    p = job.progress_percent or 0
    return [
        StageInfo(name="download", status="completed" if p >= 20 else ("in_progress" if p > 0 else "pending")),
        StageInfo(
            name="ffmpeg_clip",
            status="completed" if p >= 70 else ("in_progress" if 20 <= p < 70 else "pending"),
        ),
        StageInfo(name="upload", status="completed" if p >= 100 else ("in_progress" if p >= 70 else "pending")),
    ]


def _transform_stage_list(job: Job) -> list[StageInfo]:
    return [
        StageInfo(
            name="stem_separation",
            status="completed"
            if job.current_stage and job.current_stage != JobStage.STEM_SEPARATION
            else ("in_progress" if job.current_stage == JobStage.STEM_SEPARATION else "pending"),
        ),
        StageInfo(
            name="content_extraction",
            status="completed"
            if job.current_stage and job.current_stage.value
            in ("voice_conversion", "vocoder", "post_processing")
            else ("in_progress" if job.current_stage == JobStage.CONTENT_EXTRACTION else "pending"),
        ),
        StageInfo(
            name="voice_conversion",
            status="completed"
            if job.current_stage
            and job.current_stage.value
            in ("vocoder", "post_processing")
            else ("in_progress" if job.current_stage == JobStage.VOICE_CONVERSION else "pending"),
        ),
        StageInfo(
            name="vocoder",
            status="completed" if job.current_stage == JobStage.POST_PROCESSING else ("in_progress" if job.current_stage == JobStage.VOCODER else "pending"),
        ),
        StageInfo(
            name="post_processing",
            status="completed" if job.status == JobStatus.COMPLETED else ("in_progress" if job.current_stage == JobStage.POST_PROCESSING else "pending"),
        ),
    ]


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """List recent jobs owned by the current user."""
    q = (
        select(Job)
        .where(Job.user_id == user.id)
        .order_by(Job.created_at.desc())
        .limit(min(limit, 200))
    )
    res = await db.execute(q)
    jobs = res.scalars().all()
    return jobs


@router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get job status"""
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.user_id == user.id,
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    # Build progress info
    progress = None
    if job.status in [JobStatus.PROCESSING, JobStatus.QUEUED]:
        if job.job_type == "repair":
            stages = _repair_stage_list(job)
        elif job.job_type == "preset_render":
            stages = _preset_render_stage_list(job)
        elif job.job_type == "clip_render":
            stages = _clip_render_stage_list(job)
        else:
            stages = _transform_stage_list(job)
        stage_name = (
            job.progress_message
            if job.job_type in ("repair", "preset_render", "clip_render")
            else (job.current_stage.value if job.current_stage else None)
        )
        progress = ProgressInfo(
            stage=stage_name,
            percent_complete=job.progress_percent or 0,
            current_operation=job.progress_message,
            stages=stages,
        )

    # Build result info
    result_info = None
    if job.status == JobStatus.COMPLETED and job.result_file_id:
        # Get result file
        res_file = await db.execute(
            select(AudioFile).where(AudioFile.id == job.result_file_id)
        )
        result_file = res_file.scalar_one_or_none()
        
        if result_file:
            # Generate signed URLs
            download_url = f"/api/v1/jobs/{job.id}/download"
            signed_url = storage_service.get_presigned_url(
                bucket=result_file.storage_bucket,
                object_name=result_file.storage_path,
                expiry_seconds=settings.SIGNED_URL_EXPIRY_SECONDS,
            )
            
            # Build stems if available
            stems = None
            if job.result_stems:
                stems_data = job.result_stems
                stems = Stems(
                    vocals=stems_data.get("vocals"),
                    drums=stems_data.get("drums"),
                    bass=stems_data.get("bass"),
                    other=stems_data.get("other"),
                )
            
            result_info = DownloadResult(
                download_url=download_url,
                signed_url=signed_url,
                file_size=result_file.file_size,
                duration=result_file.duration or 0.0,
                stems=stems,
            )
    
    # Build error info
    error_info = None
    if job.status == JobStatus.FAILED:
        error_info = ErrorInfo(
            code=job.error_code or "processing_error",
            message=job.error_message or "Job processing failed",
            retryable=job.retry_count < settings.MAX_RETRIES,
            retry_after=settings.RETRY_DELAY_SECONDS if job.retry_count < settings.MAX_RETRIES else None,
        )
    
    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status.value,
        progress=progress,
        result=result_info,
        metadata=job.result_metadata,
        error=error_info,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
    )


@router.get("/{job_id}/download")
async def download_result(
    job_id: uuid.UUID,
    format: str = "wav",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download job result"""
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.user_id == user.id,
            Job.status == JobStatus.COMPLETED,
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or not completed",
        )
    
    if not job.result_file_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result file not available",
        )
    
    # Get result file
    result = await db.execute(
        select(AudioFile).where(AudioFile.id == job.result_file_id)
    )
    result_file = result.scalar_one_or_none()
    
    if not result_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result file not found",
        )
    
    # Generate signed URL (redirect to CDN or storage)
    signed_url = storage_service.get_presigned_url(
        bucket=result_file.storage_bucket,
        object_name=result_file.storage_path,
        expiry_seconds=settings.SIGNED_URL_EXPIRY_SECONDS,
    )
    
    # Redirect to signed URL
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=signed_url, status_code=302)

