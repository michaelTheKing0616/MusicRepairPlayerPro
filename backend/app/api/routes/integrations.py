"""
Extra audio/AI routes expected by the mobile client (transcribe, identify relay, voice stub).
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Any, Optional

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.audio_file import AudioFile
from app.models.user import User

logger = structlog.get_logger()
router = APIRouter(tags=["integrations"])


class TranscribeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_data: Optional[str] = Field(None, alias="audioData")
    audio_file_id: Optional[uuid.UUID] = Field(None, alias="audioFileId")
    language: str = "auto"
    fmt: str = Field("srt", alias="format")


@router.post("/audio/transcribe")
async def transcribe_audio(
    body: TranscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.consent_audio_processing:
        raise HTTPException(status_code=403, detail="Audio processing consent required.")
    wav_path: Optional[Path] = None
    td: Optional[tempfile.TemporaryDirectory] = None
    try:
        if body.audio_file_id:
            res = await db.execute(
                select(AudioFile).where(
                    AudioFile.id == body.audio_file_id,
                    AudioFile.user_id == user.id,
                )
            )
            row = res.scalar_one_or_none()
            if not row:
                raise HTTPException(status_code=404, detail="Audio file not found")
            # Lazy import to avoid initializing external clients during module import / test collection.
            from app.services.storage import storage_service

            data = storage_service.download_file(row.storage_bucket, row.storage_path)
            td = tempfile.TemporaryDirectory()
            suf = Path(row.storage_path).suffix or ".wav"
            wav_path = Path(td.name) / f"in{suf}"
            wav_path.write_bytes(data)
        else:
            raise HTTPException(status_code=400, detail="audioFileId required for backend transcribe")

        whisper_bin = shutil.which("whisper")
        if whisper_bin is None:
            raise HTTPException(
                status_code=503,
                detail="OpenAI Whisper CLI not installed on API host. Install `whisper` or run a dedicated ASR worker.",
            )

        out_dir = Path(td.name) / "whisper-out"
        out_dir.mkdir()
        lang = [] if body.language in ("auto", "", "detect") else ["--language", body.language]
        cmd = [
            whisper_bin,
            str(wav_path),
            "--output_dir",
            str(out_dir),
            "--output_format",
            body.fmt if body.fmt in ("txt", "vtt", "srt", "json") else "srt",
            *lang,
        ]
        completed = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if completed.returncode != 0:
            err = (completed.stderr or "").strip()
            logger.error("whisper_failed", stderr=err)
            raise HTTPException(status_code=500, detail=err or "whisper failed")

        outputs = list(out_dir.glob(f"*.{body.fmt}"))
        if not outputs:
            outputs = sorted(out_dir.glob("*.*"))
        if not outputs:
            raise HTTPException(status_code=500, detail="No transcript artifacts produced.")
        text = outputs[0].read_text(encoding="utf-8", errors="ignore")
        return {"format": body.fmt, "text": text, "provider": "whisper-cli"}
    finally:
        if td is not None:
            td.cleanup()


class IdentifyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_data: Optional[str] = Field(None, alias="audioData")
    fingerprint: Optional[str] = None


@router.post("/identify/audio")
async def identify_audio(body: IdentifyRequest):
    key = os.environ.get("ACOUSTID_API_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="ACOUSTID_API_KEY is not configured on the server.",
        )
    fp = body.fingerprint
    if not fp:
        raise HTTPException(status_code=400, detail="fingerprint required (client-side Chromaprint)")
    params = {"client": key, "fingerprint": fp, "meta": "recordings+releasegroups"}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get("https://api.acoustid.org/v2/lookup", params=params)
        r.raise_for_status()
        return r.json()


@router.post("/audio/fingerprint")
async def fingerprint_audio(
    audio: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    """
    Generate a Chromaprint fingerprint for an uploaded audio file.

    This uses the `fpcalc` CLI on the API host. If it isn't installed, the route returns 503.
    """
    if not user.consent_audio_processing:
        raise HTTPException(status_code=403, detail="Audio processing consent required.")

    suf = Path(audio.filename or "").suffix.lower()
    if suf and suf not in settings.ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"File format not allowed. Allowed formats: {', '.join(settings.ALLOWED_AUDIO_FORMATS)}",
        )

    fpcalc = shutil.which("fpcalc")
    if fpcalc is None:
        raise HTTPException(
            status_code=503,
            detail="Chromaprint fpcalc is not installed on the API host. Install `fpcalc` to enable fingerprinting.",
        )

    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(data) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes",
        )

    with tempfile.TemporaryDirectory() as td:
        in_path = Path(td) / f"in{(suf or '.audio')}"
        in_path.write_bytes(data)

        completed = subprocess.run(
            [fpcalc, "-raw", str(in_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if completed.returncode != 0:
            err = (completed.stderr or completed.stdout or "").strip()
            logger.error("fpcalc_failed", stderr=err)
            raise HTTPException(status_code=500, detail=err or "fpcalc failed")

        fp: Optional[str] = None
        for line in (completed.stdout or "").splitlines():
            if line.startswith("FINGERPRINT="):
                fp = line.split("=", 1)[1].strip()
                break

        if not fp:
            raise HTTPException(status_code=500, detail="fpcalc did not return a fingerprint")

        return {"fingerprint": fp}


class VoiceRespRequest(BaseModel):
    context: str
    message: str


@router.post("/ai/voice-response")
async def ai_voice_response(body: VoiceRespRequest) -> dict[str, Any]:
    """Deterministic conversational placeholder (mobile TTS can run locally via react-native-tts)."""

    reply = (
        f"I heard: {body.message.strip()}. (Server orchestration stub — wire your LLM + TTS provider here.)"
    )
    # Keep both keys for compatibility with older mobile clients.
    return {
        "text": reply,
        "reply": reply,
        "audioUrl": None,
        "duration": None,
        "provider": "server_stub",
        "contextEcho": body.context[:200],
    }
