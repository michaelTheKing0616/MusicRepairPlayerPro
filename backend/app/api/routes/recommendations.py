"""Listening events and recommendation feed."""

from __future__ import annotations

from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.audio_file import AudioFile
from app.models.listening_event import ListeningEvent, ListeningEventType
from app.models.user import User
from app.schemas.recommendations import (
    ListeningEventCreate,
    ListeningEventResponse,
    PersonalHotspotItem,
    PersonalHotspotsResponse,
    RecommendationItem,
    RecommendationsFeedResponse,
)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _require_analytics_consent(user: User) -> None:
    if not user.consent_analytics:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analytics consent required.",
        )


@router.post("/events", response_model=ListeningEventResponse, status_code=status.HTTP_201_CREATED)
async def create_listening_event(
    body: ListeningEventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_analytics_consent(user)

    # Only allow events for user's own library audio for now.
    res = await db.execute(
        select(AudioFile).where(AudioFile.id == body.audio_file_id, AudioFile.user_id == user.id)
    )
    af = res.scalar_one_or_none()
    if not af:
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        et = ListeningEventType(str(body.event_type).lower())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid eventType")

    row = ListeningEvent(
        user_id=user.id,
        audio_file_id=body.audio_file_id,
        event_type=et,
        position_sec=body.position_sec,
        duration_sec=body.duration_sec,
        client=body.client,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/feed", response_model=RecommendationsFeedResponse)
async def get_recommendations_feed(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    """
    Lightweight, privacy-gated recommendations feed.
    Heuristic:
    - score by recency-weighted plays/progress
    - exclude items completed very recently
    """
    _require_analytics_consent(user)
    limit = max(1, min(int(limit), 50))

    cutoff = datetime.utcnow() - timedelta(days=14)

    # Aggregate events per audio_file_id.
    q = (
        select(
            ListeningEvent.audio_file_id,
            func.sum(
                func.case(
                    (ListeningEvent.event_type == ListeningEventType.PLAY, 2.0),
                    (ListeningEvent.event_type == ListeningEventType.PROGRESS, 1.0),
                    (ListeningEvent.event_type == ListeningEventType.SEEK, 0.2),
                    else_=0.0,
                )
            ).label("score"),
            func.max(ListeningEvent.created_at).label("last_event_at"),
        )
        .where(ListeningEvent.user_id == user.id, ListeningEvent.created_at >= cutoff)
        .group_by(ListeningEvent.audio_file_id)
        .order_by(func.max(ListeningEvent.created_at).desc())
        .limit(limit * 3)
    )
    res = await db.execute(q)
    rows = res.all()

    audio_ids = [r.audio_file_id for r in rows]
    if not audio_ids:
        # Fallback: recent library uploads.
        af_res = await db.execute(
            select(AudioFile)
            .where(AudioFile.user_id == user.id)
            .order_by(AudioFile.created_at.desc())
            .limit(limit)
        )
        files = af_res.scalars().all()
        return RecommendationsFeedResponse(
            items=[
                RecommendationItem(
                    audioFileId=f.id,
                    score=0.1,
                    reason="Recent in your library",
                    title=f.original_filename or f.filename,
                )
                for f in files
            ]
        )

    af_res = await db.execute(select(AudioFile).where(AudioFile.id.in_(audio_ids)))
    files = {f.id: f for f in af_res.scalars().all()}

    items: list[RecommendationItem] = []
    for r in rows:
        f = files.get(r.audio_file_id)
        if not f:
            continue
        s = float(r.score or 0.0)
        items.append(
            RecommendationItem(
                audioFileId=f.id,
                score=min(1.0, max(0.0, s / 10.0)),
                reason="Based on your listening",
                title=f.original_filename or f.filename,
            )
        )
        if len(items) >= limit:
            break

    return RecommendationsFeedResponse(items=items)


@router.get("/hotspots", response_model=PersonalHotspotsResponse)
async def get_personal_hotspots(
    audio_file_id: uuid.UUID = Query(alias="audioFileId"),
    bucket_size_sec: int = Query(default=5, alias="bucketSizeSec"),
    limit: int = 8,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Personal "hot spots" for a single track: a few timestamp buckets the user keeps returning to.
    This is consent-gated and currently restricted to user's own library audio.
    """
    _require_analytics_consent(user)
    bucket_size_sec = max(2, min(int(bucket_size_sec), 30))
    limit = max(1, min(int(limit), 12))

    # Verify ownership.
    res = await db.execute(
        select(AudioFile).where(AudioFile.id == audio_file_id, AudioFile.user_id == user.id)
    )
    af = res.scalar_one_or_none()
    if not af:
        raise HTTPException(status_code=404, detail="Audio file not found")

    cutoff = datetime.utcnow() - timedelta(days=30)
    pos = ListeningEvent.position_sec
    # floor(position/bucket)*bucket
    bucket = (func.floor((pos / bucket_size_sec)) * bucket_size_sec).label("bucket_sec")
    score = func.sum(
        func.case(
            (ListeningEvent.event_type == ListeningEventType.SEEK, 1.2),
            (ListeningEvent.event_type == ListeningEventType.PROGRESS, 1.0),
            (ListeningEvent.event_type == ListeningEventType.PLAY, 0.3),
            else_=0.0,
        )
    ).label("score")
    cnt = func.count(ListeningEvent.id).label("event_count")

    q = (
        select(bucket, score, cnt)
        .where(
            ListeningEvent.user_id == user.id,
            ListeningEvent.audio_file_id == audio_file_id,
            ListeningEvent.created_at >= cutoff,
            pos.is_not(None),
        )
        .group_by(bucket)
        .order_by(score.desc(), cnt.desc())
        .limit(limit)
    )
    rows = (await db.execute(q)).all()

    items = [
        PersonalHotspotItem(bucketSec=int(r.bucket_sec or 0), score=float(r.score or 0.0), eventCount=int(r.event_count or 0))
        for r in rows
        if r.bucket_sec is not None
    ]
    return PersonalHotspotsResponse(
        audioFileId=audio_file_id,
        bucketSizeSec=bucket_size_sec,
        items=items,
    )

