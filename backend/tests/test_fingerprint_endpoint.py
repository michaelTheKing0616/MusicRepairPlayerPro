from __future__ import annotations

import io
import os
import shutil
import importlib
import importlib.util
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_audio_fingerprint_requires_fpcalc(monkeypatch):
    """
    We don't assume Chromaprint is installed in the test environment.
    Verify the API fails gracefully with 503 when `fpcalc` is missing.
    """

    # Ensure we don't import a sync-psycopg2 URL from a local `.env` during test collection.
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/musicrepair")

    monkeypatch.setattr(shutil, "which", lambda _: None)

    # Import after env override so `app.core.database` config doesn't explode on import.
    # Load the route module by file path to avoid importing `app.api` package (which pulls optional deps).
    integrations_path = (
        Path(__file__).resolve().parent.parent / "app" / "api" / "routes" / "integrations.py"
    )
    spec = importlib.util.spec_from_file_location("integrations_standalone", integrations_path)
    assert spec and spec.loader
    integrations = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(integrations)

    get_current_user = importlib.import_module("app.core.dependencies").get_current_user

    api = FastAPI()
    api.include_router(integrations.router, prefix="/api/v1")
    api.dependency_overrides[get_current_user] = lambda: SimpleNamespace(consent_audio_processing=True)
    client = TestClient(api)

    resp = client.post(
        "/api/v1/audio/fingerprint",
        files={"audio": ("sample.wav", io.BytesIO(b"RIFF....WAVE"), "audio/wav")},
    )

    assert resp.status_code == 503
    assert "fpcalc" in (resp.json().get("detail") or "").lower()

    api.dependency_overrides.clear()

