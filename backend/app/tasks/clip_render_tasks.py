"""
Celery task: render a user-defined clip range into a standalone audio artifact.

This is the "clipping engine" for library/podcast assets:
- fetch source AudioFile bytes from storage
- run ffmpeg to trim + encode
- upload artifact to storage
- create AudioFile row for artifact and link it from Clip.artifact_audio_file_id
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
from app.models.content import Clip
from app.models.job import Job, JobStatus
from app.services.storage import storage_service
from app.tasks.celery_app import celery_app

logger = structlog.get_logger()


def _ensure_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError("ffmpeg not found on PATH")
    return path


def _render_clip(
    ffmpeg_bin: str,
    input_path: Path,
    output_path: Path,
    start_ms: int,
    end_ms: int,
    fmt: str,
) -> str:
    start_s = max(0.0, start_ms / 1000.0)
    dur_s = max(0.0, (end_ms - start_ms) / 1000.0)

    # Note: accurate trimming generally requires re-encoding, so we do not use `-c copy`.
    if fmt == "wav":
        codec_args = ["-c:a", "pcm_s16le"]
        content_type = "audio/wav"
    elif fmt == "mp3":
        codec_args = ["-c:a", "libmp3lame", "-b:a", "192k"]
        content_type = "audio/mpeg"
    elif fmt in ("m4a", "aac"):
        # m4a container with AAC audio
        codec_args = ["-c:a", "aac", "-b:a", "192k"]
        content_type = "audio/mp4"
    else:
        raise ValueError(f"unsupported clip format: {fmt}")

    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-nostdin",
        "-y",
        "-ss",
        f"{start_s}",
        "-i",
        str(input_path),
        "-t",
        f"{dur_s}",
        *codec_args,
        str(output_path),
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True)
    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "").strip()
        raise RuntimeError(err or "ffmpeg exited with non-zero status")
    return content_type


async def _update_job_failed(job_id: uuid.UUID, message: str, code: str = "clip_render_failed"):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Job).where(Job.id == job_id))
        job = res.scalar_one_or_none()
        if job:
            job.status = JobStatus.FAILED
            job.error_code = code
            job.error_message = message[:4000]
            await db.commit()


@celery_app.task(bind=True, name="process_clip_render", max_retries=0)
def process_clip_render_task(self: Task, job_id: str):
    try:
        asyncio.run(_process_clip_render_async(job_id, self.request.id))
        return {"status": "completed", "job_id": job_id}
    except Exception as exc:
        logger.error("clip_render failed", job_id=job_id, error=str(exc), exc_info=True)
        try:
            asyncio.run(_update_job_failed(uuid.UUID(job_id), str(exc)))
        except Exception as inner:
            logger.error("failed to persist clip_render failure", job_id=job_id, error=str(inner))
        raise


async def _process_clip_render_async(job_id_str: str, celery_task_id: str):
    job_uuid = uuid.UUID(job_id_str)
    ffmpeg_bin = _ensure_ffmpeg()

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Job).where(Job.id == job_uuid))
        job = res.scalar_one_or_none()
        if not job:
            raise ValueError(f"job {job_id_str} not found")

        params = job.params or {}
        clip_id_raw = params.get("clipId") or params.get("clip_id")
        fmt = str(params.get("format") or "m4a").lower()

        if not clip_id_raw:
            raise ValueError("missing clipId in job params")

        clip_id = uuid.UUID(str(clip_id_raw))
        res_clip = await db.execute(select(Clip).where(Clip.id == clip_id, Clip.user_id == job.user_id))
        clip = res_clip.scalar_one_or_none()
        if not clip:
            raise ValueError("clip not found")

        # Source audio file should match clip.audio_file_id.
        res_af = await db.execute(select(AudioFile).where(AudioFile.id == clip.audio_file_id))
        src = res_af.scalar_one_or_none()
        if not src:
            raise ValueError("source audio missing")

        # Validate range.
        if clip.end_ms <= clip.start_ms:
            raise ValueError("endMs must exceed startMs")
        if (clip.end_ms - clip.start_ms) > 10 * 60 * 1000:
            raise ValueError("clip duration exceeds 10 minutes limit")

        job.status = JobStatus.PROCESSING
        job.celery_task_id = celery_task_id
        job.progress_percent = 5
        job.progress_message = "Downloading source audio"
        await db.commit()

        audio_bytes = storage_service.download_file(src.storage_bucket, src.storage_path)

        suffix = Path(src.storage_path).suffix or ".audio"
        ext = "wav" if fmt == "wav" else ("mp3" if fmt == "mp3" else "m4a")

        with tempfile.TemporaryDirectory() as td:
            tdir = Path(td)
            in_path = tdir / f"input{suffix}"
            out_path = tdir / f"clip.{ext}"
            in_path.write_bytes(audio_bytes)

            job.progress_percent = 35
            job.progress_message = "Rendering clip with FFmpeg"
            await db.commit()

            content_type = _render_clip(
                ffmpeg_bin=ffmpeg_bin,
                input_path=in_path,
                output_path=out_path,
                start_ms=clip.start_ms,
                end_ms=clip.end_ms,
                fmt=fmt,
            )

            job.progress_percent = 70
            job.progress_message = "Uploading clip artifact"
            await db.commit()

            out_stat = os.stat(out_path)
            result_id = uuid.uuid4()
            object_name = f"{job.user_id}/{result_id}.{ext}"

            with open(out_path, "rb") as fh:
                storage_service.upload_file(
                    bucket=settings.BUCKET_PROCESSED_AUDIO,
                    object_name=object_name,
                    file_data=fh,
                    content_type=content_type,
                    length=out_stat.st_size,
                )

            artifact = AudioFile(
                id=result_id,
                user_id=job.user_id,
                filename=f"clip_{clip.id}.{ext}",
                original_filename=f"clip_{src.original_filename}",
                file_size=out_stat.st_size,
                duration=max(0.0, (clip.end_ms - clip.start_ms) / 1000.0),
                sample_rate=src.sample_rate or 44100,
                channels=src.channels or 2,
                format=ext,
                storage_path=object_name,
                storage_bucket=settings.BUCKET_PROCESSED_AUDIO,
                status=FileStatus.COMPLETED,
            )
            db.add(artifact)
            await db.flush()

            clip.artifact_audio_file_id = artifact.id
            await db.flush()

            job.status = JobStatus.COMPLETED
            job.progress_percent = 100
            job.progress_message = "Completed"
            job.result_file_id = artifact.id
            job.result_metadata = {
                "engine": "ffmpeg_clip",
                "clipId": str(clip.id),
                "format": fmt,
                "celery_task_id": celery_task_id,
            }
            await db.commit()

            logger.info("clip_render completed", job_id=job_id_str, clip_id=str(clip.id), result_file_id=str(result_id))

