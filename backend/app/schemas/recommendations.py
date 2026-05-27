"""Listening events + recommendation feed schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ListeningEventCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_file_id: UUID = Field(alias="audioFileId")
    event_type: str = Field(alias="eventType")
    position_sec: Optional[float] = Field(None, alias="positionSec")
    duration_sec: Optional[float] = Field(None, alias="durationSec")
    client: Optional[str] = None


class ListeningEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, ser_json_by_alias=True)

    id: UUID
    audio_file_id: UUID = Field(alias="audioFileId")
    event_type: str = Field(alias="eventType")
    position_sec: Optional[float] = Field(None, alias="positionSec")
    duration_sec: Optional[float] = Field(None, alias="durationSec")
    created_at: datetime = Field(serialization_alias="createdAt")


class RecommendationItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    audio_file_id: UUID = Field(alias="audioFileId")
    score: float
    reason: str
    title: Optional[str] = None


class RecommendationsFeedResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    items: list[RecommendationItem]


class PersonalHotspotItem(BaseModel):
    """
    A time bucket that the user frequently seeks/progresses around for a given track.
    This is a privacy-safe "social layer" primitive (currently personal only).
    """

    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    bucket_sec: int = Field(alias="bucketSec")
    score: float
    event_count: int = Field(alias="eventCount")


class PersonalHotspotsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    audio_file_id: UUID = Field(alias="audioFileId")
    bucket_size_sec: int = Field(alias="bucketSizeSec")
    items: list[PersonalHotspotItem]

