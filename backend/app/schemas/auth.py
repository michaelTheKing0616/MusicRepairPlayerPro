"""
Authentication schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class UserCreate(BaseModel):
    # Avoid hard dependency on `email-validator` in minimal environments.
    # Enforce a basic email shape check; strict validation can be added when dependency is available.
    email: str = Field(min_length=3)
    password: str
    name: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    is_active: bool
    is_premium: bool
    consent_audio_processing: bool
    consent_voice_cloning: bool
    age_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


