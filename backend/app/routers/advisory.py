from fastapi import APIRouter, Query, Depends
from typing import Dict, Any, Optional
from app.schemas import AdvisoryResponse
from app.services.advisory_service import advisory_service
from app.auth import require_auth
from app.config import settings

router = APIRouter(prefix="/api/advisory", tags=["Advisory"])

@router.get("", response_model=AdvisoryResponse)
async def get_advisory(
    profession: str = Query(default="general", description="User profession/category"),
    lat: float = Query(default=settings.DEFAULT_LAT, description="Latitude"),
    lon: float = Query(default=settings.DEFAULT_LON, description="Longitude"),
    lang: Optional[str] = Query(default=None, description="Language code"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    selected_lang = lang or auth.get("language_code", "en")
    return await advisory_service.get_profession_advisory(
        profession=profession,
        lat=lat,
        lon=lon,
        lang=selected_lang
    )
