"""
Job model for tracking processing jobs
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.core.database import Base


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobStage(str, enum.Enum):
    STEM_SEPARATION = "stem_separation"
    CONTENT_EXTRACTION = "content_extraction"
    VOICE_CONVERSION = "voice_conversion"
    STYLE_TRANSFER = "style_transfer"
    VOCODER = "vocoder"
    POST_PROCESSING = "post_processing"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    audio_file_id = Column(UUID(as_uuid=True), ForeignKey("audio_files.id"), nullable=False, index=True)
    
    # Job info
    job_type = Column(String(50), nullable=False)  # transform, repair, etc.
    status = Column(SQLEnum(JobStatus), default=JobStatus.QUEUED, nullable=False, index=True)
    current_stage = Column(SQLEnum(JobStage))
    
    # Progress
    progress_percent = Column(Integer, default=0)
    progress_message = Column(Text)
    
    # Job parameters
    params = Column(JSON)  # Store transformation parameters
    
    # Results
    result_file_id = Column(UUID(as_uuid=True), ForeignKey("audio_files.id"), nullable=True)
    result_stems = Column(JSON)  # Store stem file IDs/URLs
    result_metadata = Column(JSON)  # Store extracted metadata (transcription, etc.)
    
    # Error handling
    error_code = Column(String(100))
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Celery task ID
    celery_task_id = Column(String(255), index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", backref="jobs")
    audio_file = relationship("AudioFile", foreign_keys=[audio_file_id], back_populates="jobs")
    result_file = relationship("AudioFile", foreign_keys=[result_file_id])

    def __repr__(self):
        return f"<Job(id={self.id}, status={self.status})>"


