"""Listening events for recommendations/analytics (privacy-gated)."""

import uuid
import enum
from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class ListeningEventType(str, enum.Enum):
    PLAY = "play"
    PAUSE = "pause"
    SEEK = "seek"
    PROGRESS = "progress"
    COMPLETE = "complete"


class ListeningEvent(Base):
    __tablename__ = "listening_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # For now we only persist library audio events.
    audio_file_id = Column(UUID(as_uuid=True), ForeignKey("audio_files.id"), nullable=False, index=True)

    event_type = Column(SQLEnum(ListeningEventType), nullable=False, index=True)
    position_sec = Column(Float, nullable=True)
    duration_sec = Column(Float, nullable=True)

    # Optional client details to help debug recommendations quality.
    client = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

