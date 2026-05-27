"""
Transform request model (for voice/style transformations)
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class TransformRequest(Base):
    __tablename__ = "transform_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Transform type
    transform_type = Column(String(50), nullable=False)  # voice, style, combined
    
    # Parameters
    voice_preset = Column(String(100))
    style_preset = Column(String(100))
    intensity = Column(Float, default=0.85)  # 0.0 - 1.0
    preserve_pitch = Column(Boolean, default=True)
    
    # Options
    separate_stems = Column(Boolean, default=False)
    extract_content = Column(Boolean, default=False)
    quality = Column(String(20), default="high")  # preview, standard, high
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<TransformRequest(id={self.id}, transform_type={self.transform_type})>"


