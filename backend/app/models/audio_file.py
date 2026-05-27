"""
Audio file model
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.core.database import Base


class FileStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AudioFile(Base):
    __tablename__ = "audio_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # File info
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    duration = Column(Float)  # Duration in seconds
    sample_rate = Column(Integer)
    channels = Column(Integer)
    format = Column(String(10))  # wav, mp3, flac, etc.
    
    # Storage
    storage_path = Column(String(512), nullable=False, unique=True)
    storage_bucket = Column(String(100), nullable=False)
    
    # Metadata
    status = Column(SQLEnum(FileStatus), default=FileStatus.UPLOADED, nullable=False)
    
    # Optional metadata
    artist = Column(String(255))
    title = Column(String(255))
    album = Column(String(255))
    genre = Column(String(100))
    year = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="audio_files")
    jobs = relationship("Job", back_populates="audio_file")

    def __repr__(self):
        return f"<AudioFile(id={self.id}, filename={self.filename})>"


