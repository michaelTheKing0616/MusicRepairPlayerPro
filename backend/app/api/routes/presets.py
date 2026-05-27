"""Listening preset catalog (mirrors mobile `preset-engine`)."""
from fastapi import APIRouter

from app.presets.catalog import catalog_public_list

router = APIRouter(prefix="/listening-presets", tags=["listening-presets"])


@router.get("/catalog")
async def get_listening_preset_catalog():
    """Public lightweight catalog for clients (offline chains stay server-side for workers)."""
    return catalog_public_list()
