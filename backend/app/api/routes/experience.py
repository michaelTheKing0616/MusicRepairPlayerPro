"""Clips, moments, curated radio streams, podcast episodes."""
from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.content import Clip, Moment, PodcastEpisode, RadioStation
from app.models.user import User
from app.tasks.clip_render_tasks import process_clip_render_task
from app.schemas.experience import (
    ClipCreate,
    ClipResponse,
    ClipRenderEnqueueResponse,
    MomentCreate,
    MomentResponse,
    PodcastEpisodeResponse,
    RadioStationResponse,
)

router = APIRouter(prefix="/experience", tags=["experience"])


@router.post("/clips", response_model=ClipResponse, status_code=status.HTTP_201_CREATED)
async def create_clip(
    body: ClipCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.end_ms <= body.start_ms:
        raise HTTPException(status_code=400, detail="endMs must exceed startMs")
    row = Clip(
        user_id=user.id,
        audio_file_id=body.audio_file_id,
        start_ms=body.start_ms,
        end_ms=body.end_ms,
        title=body.title,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/clips", response_model=List[ClipResponse])
async def list_clips(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = await db.execute(
        select(Clip).where(Clip.user_id == user.id).order_by(Clip.created_at.desc()).limit(200)
    )
    return q.scalars().all()


@router.get("/clips/{clip_id}", response_model=ClipResponse)
async def get_clip(
    clip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Clip).where(Clip.id == clip_id, Clip.user_id == user.id))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Clip not found")
    return row


@router.delete("/clips/{clip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clip(
    clip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Clip).where(Clip.id == clip_id, Clip.user_id == user.id))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Clip not found")
    db.delete(row)
    await db.commit()


@router.post(
    "/clips/{clip_id}/render",
    response_model=ClipRenderEnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def render_clip(
    clip_id: uuid.UUID,
    format: Optional[str] = "m4a",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Queue a clip_render job that produces a standalone audio artifact for this clip.
    The artifact is linked from `Clip.artifact_audio_file_id` and also returned via `/jobs/{id}/status`.
    """
    if not user.consent_audio_processing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Audio processing consent required.",
        )
    res = await db.execute(select(Clip).where(Clip.id == clip_id, Clip.user_id == user.id))
    clip = res.scalar_one_or_none()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    if clip.end_ms <= clip.start_ms:
        raise HTTPException(status_code=400, detail="endMs must exceed startMs")
    fmt = str(format or "m4a").lower()
    if fmt not in ("m4a", "mp3", "wav"):
        raise HTTPException(status_code=400, detail="format must be m4a, mp3, or wav")

    # Create Job row and enqueue Celery
    from app.models.job import Job as JobRow, JobStatus as JobRowStatus

    job = JobRow(
        user_id=user.id,
        audio_file_id=clip.audio_file_id,
        job_type="clip_render",
        status=JobRowStatus.QUEUED,
        progress_percent=0,
        progress_message="Queued",
        params={"clipId": str(clip.id), "format": fmt},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        task = process_clip_render_task.delay(str(job.id))
        job.celery_task_id = task.id
        await db.commit()
    except Exception as exc:
        job.status = JobRowStatus.FAILED
        job.error_code = "queue_unavailable"
        job.error_message = "Could not queue clip render. Ensure Redis and a Celery worker are running."
        await db.commit()
        raise HTTPException(status_code=503, detail=job.error_message) from exc

    return {"id": str(job.id), "clipId": str(clip.id), "format": fmt, "status": "queued"}


@router.post("/moments", response_model=MomentResponse, status_code=status.HTTP_201_CREATED)
async def create_moment(
    body: MomentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = Moment(
        user_id=user.id,
        audio_file_id=body.audio_file_id,
        position_ms=body.position_ms,
        note=body.note,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/moments", response_model=List[MomentResponse])
async def list_moments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    audio_file_id: uuid.UUID | None = Query(default=None, alias="audioFileId"),
):
    stmt = select(Moment).where(Moment.user_id == user.id)
    if audio_file_id is not None:
        stmt = stmt.where(Moment.audio_file_id == audio_file_id)
    q = await db.execute(stmt.order_by(Moment.created_at.desc()).limit(200))
    return q.scalars().all()


@router.get("/moments/{moment_id}", response_model=MomentResponse)
async def get_moment(
    moment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Moment).where(Moment.id == moment_id, Moment.user_id == user.id))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Moment not found")
    return row


@router.get("/radio/stations", response_model=List[RadioStationResponse])
async def list_radio_stations(db: AsyncSession = Depends(get_db)):
    q = await db.execute(
        select(RadioStation).where(RadioStation.is_active.is_(True)).order_by(RadioStation.name.asc())
    )
    return q.scalars().all()


@router.get("/podcasts/{show_slug}/episodes", response_model=List[PodcastEpisodeResponse])
async def list_podcast_episodes(show_slug: str, db: AsyncSession = Depends(get_db)):
    q = await db.execute(
        select(PodcastEpisode)
        .where(PodcastEpisode.show_slug == show_slug)
        .order_by(desc(PodcastEpisode.published_at).nulls_last())
        .limit(100)
    )
    return q.scalars().all()
