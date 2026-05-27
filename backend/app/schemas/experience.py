"""API models for clips, moments, radio, podcasts, analysis."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ClipCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_file_id: UUID = Field(alias="audioFileId")
    start_ms: int = Field(ge=0, alias="startMs")
    end_ms: int = Field(ge=0, alias="endMs")
    title: Optional[str] = None


class ClipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, ser_json_by_alias=True)

    id: UUID
    audio_file_id: UUID = Field(alias="audioFileId")
    start_ms: int = Field(alias="startMs")
    end_ms: int = Field(alias="endMs")
    title: Optional[str] = None
    artifact_audio_file_id: Optional[UUID] = Field(None, alias="artifactAudioFileId")
    created_at: datetime = Field(serialization_alias="createdAt")


class ClipRenderEnqueueResponse(BaseModel):
    """Response for enqueueing a clip_render job."""

    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    id: str
    clip_id: str = Field(alias="clipId")
    format: str
    status: str


class MomentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_file_id: UUID = Field(alias="audioFileId")
    position_ms: int = Field(ge=0, alias="positionMs")
    note: Optional[str] = None


class MomentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, ser_json_by_alias=True)

    id: UUID
    audio_file_id: UUID = Field(alias="audioFileId")
    position_ms: int = Field(alias="positionMs")
    note: Optional[str] = None
    created_at: datetime = Field(serialization_alias="createdAt")


class RadioStationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, ser_json_by_alias=True)

    id: UUID
    slug: str
    name: str
    stream_url: str = Field(alias="streamUrl")
    genre: Optional[str] = None


class PodcastEpisodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, ser_json_by_alias=True)

    id: UUID
    show_slug: str = Field(alias="showSlug")
    title: str
    description: Optional[str] = None
    enclosure_url: str = Field(alias="enclosureUrl")
    duration_sec: Optional[float] = Field(None, alias="durationSec")
    published_at: Optional[datetime] = Field(None, alias="publishedAt")


class AudioAnalysisResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    audio_file_id: UUID = Field(alias="audioFileId")
    duration_sec: float = Field(alias="durationSec")
    sample_rate: int = Field(alias="sampleRate")
    channels: int
    peak: float
    rms: float
    clipping_ratio: float = Field(alias="clippingRatio")
    zero_crossing_rate: float = Field(alias="zeroCrossingRate")
    spectral_centroid_hz_mean: float = Field(alias="spectralCentroidHzMean")
    damage_hints: dict[str, Any] = Field(alias="damageHints")


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    consent_audio_processing: Optional[bool] = Field(None, alias="consentAudioProcessing")
    consent_voice_cloning: Optional[bool] = Field(None, alias="consentVoiceCloning")
    consent_analytics: Optional[bool] = Field(None, alias="consentAnalytics")
    consent_model_training: Optional[bool] = Field(None, alias="consentModelTraining")
    age_verified: Optional[bool] = Field(None, alias="ageVerified")
