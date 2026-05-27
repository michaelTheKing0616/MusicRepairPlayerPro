"""
Celery tasks for offline audio repair (FFmpeg DSP chains).

Each modelType maps to a distinct filter graph (noise-focused, stereo/mix-focused,
vocals-forward). Outputs 16-bit WAV in processed-audio bucket.
"""
from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

import structlog
from celery import Task
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.audio_file import AudioFile, FileStatus
from app.models.job import Job, JobStatus
from app.services.storage import storage_service
from app.tasks.celery_app import celery_app

logger = structlog.get_logger()


# Distinct FFmpeg filter graphs per model — executed by ffmpeg binary on the worker host.
_FFmpeg_FILTER_BY_MODEL = {
    "deepfilternet": (
        "highpass=f=65,lowpass=f=17800,"
        "afftdn=nf=-27:nr=21:tn=1,"
        "acompressor=threshold=-21dB:ratio=2.8:attack=8:release=180"
    ),
    "demucs": (
        "extrastereo=m=0.42,"
        "highpass=f=38,lowpass=f=19300,"
        "acompressor=threshold=-18dB:ratio=4.2:attack=4:release=160"
    ),
    "uvr": (
        "highpass=f=95,lowpass=f=14800,"
        "equalizer=f=2800:width_type=h:width=2:g=3.2,"
        "pan=stereo|c0=0.68*c0+0.38*c1|c1=0.32*c0+0.72*c1,"
        "acompressor=threshold=-19dB:ratio=3:attack=5:release=95"
    ),
}


def _ensure_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError(
            "ffmpeg not found on PATH; install ffmpeg in the worker environment "
            "(see backend/Dockerfile)."
        )
    return path


def _run_ffmpeg(ffmpeg_bin: str, input_path: Path, output_path: Path, af_chain: str) -> None:
    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-nostdin",
        "-y",
        "-i",
        str(input_path),
        "-af",
        af_chain,
        "-c:a",
        "pcm_s16le",
        str(output_path),
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True)
    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "").strip()
        raise RuntimeError(err or "ffmpeg exited with non-zero status")


async def _update_job_failed(job_id: uuid.UUID, message: str, code: str = "repair_failed"):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalar_one_or_none()
        if job:
            job.status = JobStatus.FAILED
            job.error_code = code
            job.error_message = message[:4000]
            await db.commit()


@celery_app.task(bind=True, name="process_repair", max_retries=0)
def process_repair_task(self: Task, job_id: str):
    """Single-shot repair task; avoids marking the job failed then retrying (inconsistent UX)."""
    try:
        asyncio.run(_process_repair_async(job_id, self.request.id))
        return {"status": "completed", "job_id": job_id}
    except Exception as exc:
        logger.error("repair task failed", job_id=job_id, error=str(exc), exc_info=True)
        try:
            asyncio.run(_update_job_failed(uuid.UUID(job_id), str(exc)))
        except Exception as inner:
            logger.error("failed to persist job failure", job_id=job_id, error=str(inner))
        raise


async def _process_repair_async(job_id_str: str, celery_task_id: str):
    job_uuid = uuid.UUID(job_id_str)
    ffmpeg_bin = _ensure_ffmpeg()

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Job).where(Job.id == job_uuid))
        job = res.scalar_one_or_none()
        if not job:
            raise ValueError(f"job {job_id_str} not found")
        res_af = await db.execute(select(AudioFile).where(AudioFile.id == job.audio_file_id))
        src = res_af.scalar_one_or_none()
        if not src:
            raise ValueError("source audio missing")

        job.status = JobStatus.PROCESSING
        job.celery_task_id = celery_task_id
        job.progress_percent = 5
        job.progress_message = "Downloading source audio"
        await db.commit()
        await db.refresh(job)

        params = job.params or {}
        model_type = str(params.get("modelType", "deepfilternet")).lower()
        if model_type not in _FFmpeg_FILTER_BY_MODEL:
            raise ValueError(f"unsupported modelType: {model_type}")

        audio_bytes = storage_service.download_file(src.storage_bucket, src.storage_path)

        suffix = Path(src.storage_path).suffix or ".wav"
        with tempfile.TemporaryDirectory() as td:
            tdir = Path(td)
            in_path = tdir / f"input{suffix}"
            out_path = tdir / "repaired.wav"
            in_path.write_bytes(audio_bytes)

            job.progress_percent = 35
            job.progress_message = "Running FFmpeg repair chain"
            await db.commit()

            chain = _FFmpeg_FILTER_BY_MODEL[model_type]
            _run_ffmpeg(ffmpeg_bin, in_path, out_path, chain)

            job.progress_percent = 70
            job.progress_message = "Uploading repaired file"
            await db.commit()

            out_stat = os.stat(out_path)
            result_id = uuid.uuid4()
            object_name = f"{job.user_id}/{result_id}.wav"

            with open(out_path, "rb") as fh:
                storage_service.upload_file(
                    bucket=settings.BUCKET_PROCESSED_AUDIO,
                    object_name=object_name,
                    file_data=fh,
                    content_type="audio/wav",
                    length=out_stat.st_size,
                )

            repaired = AudioFile(
                id=result_id,
                user_id=job.user_id,
                filename=f"repaired_{result_id}.wav",
                original_filename=f"repaired_{src.original_filename}",
                file_size=out_stat.st_size,
                duration=src.duration,
                sample_rate=src.sample_rate or 44100,
                channels=src.channels or 2,
                format="wav",
                storage_path=object_name,
                storage_bucket=settings.BUCKET_PROCESSED_AUDIO,
                status=FileStatus.COMPLETED,
            )
            db.add(repaired)
            await db.flush()

            job.status = JobStatus.COMPLETED
            job.progress_percent = 100
            job.progress_message = "Completed"
            job.result_file_id = repaired.id
            job.result_metadata = {
                "engine": "ffmpeg",
                "modelType": model_type,
                "celery_task_id": celery_task_id,
            }
            await db.commit()

            logger.info(
                "repair completed",
                job_id=job_id_str,
                result_file_id=str(result_id),
                model_type=model_type,
            )
