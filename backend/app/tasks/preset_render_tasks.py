"""
Celery task: offline listening-preset render via FFmpeg (`offlineFfmpegAf` from catalog).
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
from app.presets.catalog import resolve_offline_ffmpeg_af
from app.services.storage import storage_service
from app.tasks.celery_app import celery_app

logger = structlog.get_logger()


def _ensure_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError("ffmpeg not found on PATH")
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


async def _update_job_failed(job_id: uuid.UUID, message: str, code: str = "preset_render_failed"):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalar_one_or_none()
        if job:
            job.status = JobStatus.FAILED
            job.error_code = code
            job.error_message = message[:4000]
            await db.commit()


@celery_app.task(bind=True, name="process_preset_render", max_retries=0)
def process_preset_render_task(self: Task, job_id: str):
    try:
        asyncio.run(_process_preset_render_async(job_id, self.request.id))
        return {"status": "completed", "job_id": job_id}
    except Exception as exc:
        logger.error("preset_render failed", job_id=job_id, error=str(exc), exc_info=True)
        try:
            asyncio.run(_update_job_failed(uuid.UUID(job_id), str(exc)))
        except Exception as inner:
            logger.error("failed to persist job failure", job_id=job_id, error=str(inner))
        raise


async def _process_preset_render_async(job_id_str: str, celery_task_id: str):
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

        params = job.params or {}
        preset_id = str(params.get("presetId") or params.get("preset_id") or "").strip()
        if not preset_id:
            raise ValueError("missing presetId in job params")

        af_chain = resolve_offline_ffmpeg_af(preset_id)

        job.status = JobStatus.PROCESSING
        job.celery_task_id = celery_task_id
        job.progress_percent = 5
        job.progress_message = "Downloading source audio"
        await db.commit()
        await db.refresh(job)

        audio_bytes = storage_service.download_file(src.storage_bucket, src.storage_path)
        suffix = Path(src.storage_path).suffix or ".wav"
        with tempfile.TemporaryDirectory() as td:
            tdir = Path(td)
            in_path = tdir / f"input{suffix}"
            out_path = tdir / "rendered.wav"
            in_path.write_bytes(audio_bytes)

            job.progress_percent = 35
            job.progress_message = "Running FFmpeg listening preset"
            await db.commit()

            _run_ffmpeg(ffmpeg_bin, in_path, out_path, af_chain)

            job.progress_percent = 70
            job.progress_message = "Uploading rendered file"
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

            rendered = AudioFile(
                id=result_id,
                user_id=job.user_id,
                filename=f"preset_{preset_id}_{result_id}.wav",
                original_filename=f"preset_{src.original_filename}",
                file_size=out_stat.st_size,
                duration=src.duration,
                sample_rate=src.sample_rate or 44100,
                channels=src.channels or 2,
                format="wav",
                storage_path=object_name,
                storage_bucket=settings.BUCKET_PROCESSED_AUDIO,
                status=FileStatus.COMPLETED,
            )
            db.add(rendered)
            await db.flush()

            job.status = JobStatus.COMPLETED
            job.progress_percent = 100
            job.progress_message = "Completed"
            job.result_file_id = rendered.id
            job.result_metadata = {
                "engine": "ffmpeg_preset",
                "presetId": preset_id,
                "celery_task_id": celery_task_id,
            }
            await db.commit()

            logger.info(
                "preset_render completed",
                job_id=job_id_str,
                result_file_id=str(result_id),
                preset_id=preset_id,
            )
