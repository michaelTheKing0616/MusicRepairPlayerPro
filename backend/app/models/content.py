"""User-generated clips/moments and curated radio/podcast metadata."""
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class Clip(Base):
    __tablename__ = "clips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    audio_file_id = Column(UUID(as_uuid=True), ForeignKey("audio_files.id"), nullable=False, index=True)
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    # Rendered audio artifact for this clip (created by clip_render jobs).
    artifact_audio_file_id = Column(
        UUID(as_uuid=True),
        ForeignKey("audio_files.id"),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Moment(Base):
    __tablename__ = "moments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    audio_file_id = Column(UUID(as_uuid=True), ForeignKey("audio_files.id"), nullable=False, index=True)
    position_ms = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RadioStation(Base):
    __tablename__ = "radio_stations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    stream_url = Column(String(1024), nullable=False)
    genre = Column(String(100), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PodcastEpisode(Base):
    __tablename__ = "podcast_episodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    show_slug = Column(String(120), nullable=False, index=True)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    enclosure_url = Column(String(1024), nullable=False)
    duration_sec = Column(Float, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
