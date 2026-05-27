import json
import re
from pathlib import Path

import pytest

_DATA = Path(__file__).resolve().parent.parent / "app" / "data" / "listening_presets.json"
_AF_PATTERN = re.compile(r"^[a-z0-9_\-=:,.\[\]|%*+^'@ ]+$", re.I)


def test_listening_presets_json_present():
    assert _DATA.is_file(), "Run `cd mobile && npm run export-presets`"


@pytest.mark.skipif(not _DATA.is_file(), reason="listening_presets.json missing")
def test_ninety_rows_and_af_chars():
    data = json.loads(_DATA.read_text(encoding="utf-8"))
    assert len(data) == 90
    for row in data:
        af = row.get("offlineFfmpegAf") or ""
        assert af
        assert _AF_PATTERN.fullmatch(af)


@pytest.mark.skipif(not _DATA.is_file(), reason="listening_presets.json missing")
def test_unique_ids():
    data = json.loads(_DATA.read_text(encoding="utf-8"))
    ids = [r["id"] for r in data]
    assert len(set(ids)) == len(ids)

