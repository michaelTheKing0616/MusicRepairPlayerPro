"""
Load `listening_presets.json` (generated from mobile `LISTENING_PRESETS` via npm script).
Validates offline FFmpeg filter graphs with the same conservative pattern as TS `validate.ts`.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "listening_presets.json"
_OFFLINE_AF_PATTERN = re.compile(r"^[a-z0-9_\-=:,.\[\]|%*+^'@ ]+$", re.I)


def validate_offline_af(af: str) -> bool:
    return bool(af and _OFFLINE_AF_PATTERN.fullmatch(af))


@lru_cache
def _raw_catalog() -> tuple[dict[str, Any], ...]:
    if not _DATA_FILE.is_file():
        raise FileNotFoundError(
            f"Missing {_DATA_FILE}; run `npm run export-presets` in /mobile"
        )
    with open(_DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)
    return tuple(data)


def preset_ids() -> list[str]:
    return [p["id"] for p in _raw_catalog()]


def preset_by_id(preset_id: str) -> dict[str, Any] | None:
    for p in _raw_catalog():
        if p.get("id") == preset_id:
            return p
    return None


def resolve_offline_ffmpeg_af(preset_id: str) -> str:
    p = preset_by_id(preset_id)
    if not p:
        raise KeyError(f"Unknown preset_id: {preset_id}")
    af = p.get("offlineFfmpegAf") or ""
    if not validate_offline_af(af):
        raise ValueError(f"Invalid offline FFmpeg graph for preset {preset_id}")
    return af


def catalog_public_list() -> list[dict[str, Any]]:
    """Lightweight payload for API clients (no realtime graph noise)."""
    out: list[dict[str, Any]] = []
    for p in _raw_catalog():
        out.append(
            {
                "id": p["id"],
                "familyKey": p["familyKey"],
                "tier": p["tier"],
                "name": p["name"],
                "summary": p["summary"],
                "category": p["category"],
                "routing": p["routing"],
                "intensity": p["intensity"],
            }
        )
    return out
