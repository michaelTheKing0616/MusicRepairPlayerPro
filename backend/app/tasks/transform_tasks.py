"""
Celery tasks for audio transformation
"""
from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.job import Job, JobStatus, JobStage
from app.models.audio_file import AudioFile, FileStatus
from app.services.storage import storage_service
import structlog
import uuid

logger = structlog.get_logger()
try:
    from app.services.ai_processing import AIProcessingService  # type: ignore

    ai_service = AIProcessingService()
except Exception:  # pragma: no cover
    AIProcessingService = None  # type: ignore
    ai_service = None


async def get_db_session() -> AsyncSession:
    """Get database session for Celery task"""
    async with AsyncSessionLocal() as session:
        return session


@celery_app.task(bind=True, name="process_transform", max_retries=3)
def process_transform_task(self: Task, job_id: str):
    """
    Process audio transformation job
    
    This task:
    1. Updates job status to processing
    2. Calls AI processing service
    3. Updates job with results
    4. Handles errors and retries
    """
    import asyncio
    
    try:
        logger.info("Starting transform task", job_id=job_id, task_id=self.request.id)
        
        # Run async function
        result = asyncio.run(_process_transform_async(job_id, self.request.id))
        
        logger.info("Transform task completed", job_id=job_id)
        return result
        
    except Exception as exc:
        logger.error("Transform task failed", job_id=job_id, error=str(exc), exc_info=True)
        
        # Update job status to failed
        asyncio.run(_update_job_status(job_id, JobStatus.FAILED, error_message=str(exc)))
        
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries), max_retries=settings.MAX_RETRIES)


async def _process_transform_async(job_id: str, task_id: str):
    """Async function to process transformation"""
    async with AsyncSessionLocal() as db:
        try:
            # Get job
            result = await db.execute(select(Job).where(Job.id == uuid.UUID(job_id)))
            job = result.scalar_one_or_none()
            
            if not job:
                raise ValueError(f"Job {job_id} not found")
            
            # Get audio file
            result = await db.execute(select(AudioFile).where(AudioFile.id == job.audio_file_id))
            audio_file = result.scalar_one_or_none()
            
            if not audio_file:
                raise ValueError(f"Audio file {job.audio_file_id} not found")
            
            # Get transform request
            from app.models.transform_request import TransformRequest
            result = await db.execute(select(TransformRequest).where(TransformRequest.job_id == job.id))
            transform_request = result.scalar_one_or_none()
            
            if not transform_request:
                raise ValueError(f"Transform request for job {job_id} not found")
            
            # Update job status to processing
            job.status = JobStatus.PROCESSING
            job.celery_task_id = task_id
            job.current_stage = JobStage.STEM_SEPARATION
            job.progress_percent = 5
            job.progress_message = "Starting processing..."
            await db.commit()
            
            # Prepare transform parameters
            transform_params = {
                "voice_preset": transform_request.voice_preset,
                "style_preset": transform_request.style_preset,
                "intensity": transform_request.intensity,
                "preserve_pitch": transform_request.preserve_pitch,
            }
            
            options = {
                "separate_stems": transform_request.separate_stems,
                "extract_content": transform_request.extract_content,
                "quality": transform_request.quality,
            }
            
            # Process transformation
            logger.info("Processing transformation", job_id=job_id)
            
            # Update progress: Stem separation
            job.current_stage = JobStage.STEM_SEPARATION
            job.progress_percent = 10
            job.progress_message = "Separating stems..."
            await db.commit()
            
            if options.get("separate_stems"):
                # Stem separation happens in AI service
                pass
            
            # Update progress: Content extraction
            if options.get("extract_content"):
                job.current_stage = JobStage.CONTENT_EXTRACTION
                job.progress_percent = 30
                job.progress_message = "Extracting content..."
                await db.commit()
            
            # Update progress: Voice conversion
            if transform_params.get("voice_preset"):
                job.current_stage = JobStage.VOICE_CONVERSION
                job.progress_percent = 50
                job.progress_message = "Converting voice..."
                await db.commit()
            
            # Update progress: Style transfer
            if transform_params.get("style_preset"):
                job.current_stage = JobStage.STYLE_TRANSFER
                job.progress_percent = 70
                job.progress_message = "Transferring style..."
                await db.commit()
            
            # Update progress: Vocoder
            job.current_stage = JobStage.VOCODER
            job.progress_percent = 85
            job.progress_message = "Synthesizing audio..."
            await db.commit()
            
            # Call AI processing service
            if ai_service is None:
                raise RuntimeError(
                    "AI processing dependencies are not installed on this host. "
                    "Install torch/torchaudio to enable transform jobs."
                )
            processing_result = ai_service.process_transform(
                job_id=job_id,
                audio_file_id=str(audio_file.id),
                transform_params=transform_params,
                options=options,
            )
            
            # Update progress: Post-processing
            job.current_stage = JobStage.POST_PROCESSING
            job.progress_percent = 95
            job.progress_message = "Post-processing..."
            await db.commit()
            
            # Create result audio file record
            result_file = AudioFile(
                user_id=job.user_id,
                filename=f"transformed_{job_id}.wav",
                original_filename=f"transformed_{job_id}.wav",
                file_size=0,  # Will be updated
                duration=audio_file.duration,
                sample_rate=44100,
                channels=2,
                format="wav",
                storage_path=processing_result["result_file_path"],
                storage_bucket=settings.BUCKET_PROCESSED_AUDIO,
                status=FileStatus.COMPLETED,
            )
            
            db.add(result_file)
            await db.flush()
            
            # Update job with results
            job.status = JobStatus.COMPLETED
            job.result_file_id = result_file.id
            job.result_stems = processing_result.get("stems")
            job.result_metadata = processing_result.get("metadata")
            job.progress_percent = 100
            job.progress_message = "Completed"
            job.current_stage = None
            
            from datetime import datetime
            job.completed_at = datetime.utcnow()
            
            await db.commit()
            
            logger.info("Transform processing completed", job_id=job_id, result_file_id=str(result_file.id))
            
            return {
                "status": "completed",
                "job_id": job_id,
                "result_file_id": str(result_file.id),
                "stems": processing_result.get("stems"),
                "metadata": processing_result.get("metadata"),
            }
            
        except Exception as e:
            logger.error("Error in transform processing", job_id=job_id, error=str(e), exc_info=True)
            await _update_job_status(job_id, JobStatus.FAILED, error_message=str(e))
            raise


async def _update_job_status(job_id: str, status: JobStatus, error_message: str = None):
    """Update job status in database"""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Job).where(Job.id == uuid.UUID(job_id)))
            job = result.scalar_one_or_none()
            
            if job:
                job.status = status
                if error_message:
                    job.error_message = error_message
                    job.error_code = "processing_error"
                
                from datetime import datetime
                if status == JobStatus.FAILED:
                    job.failed_at = datetime.utcnow()
                
                await db.commit()
        except Exception as e:
            logger.error("Failed to update job status", job_id=job_id, error=str(e))
