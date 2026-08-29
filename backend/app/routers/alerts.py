from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Dict, Any, Optional
from app.schemas import ActiveAlertsResponse, AlertPrecautionsResponse, AlertResponseItem
from app.services.alerts_service import alerts_service
from app.services.translation_service import translation_service
from app.auth import require_auth
from app.config import settings

router = APIRouter(prefix="/api/alerts", tags=["Disaster Alerts"])

@router.get("/active", response_model=ActiveAlertsResponse)
async def get_active_alerts(
    lat: float = Query(default=settings.DEFAULT_LAT, description="Latitude"),
    lon: float = Query(default=settings.DEFAULT_LON, description="Longitude"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    alerts = await alerts_service.evaluate_active_alerts(lat, lon)
    formatted = []
    for a in alerts:
        formatted.append(AlertResponseItem(
            id=str(a.get("_id") or a.get("id") or "alert_default"),
            lat=a.get("lat", lat),
            lon=a.get("lon", lon),
            region_name=a.get("region_name", "Local Area"),
            alert_type=a.get("alert_type", "general"),
            severity=a.get("severity", "advisory"),
            source=a.get("source", "derived"),
            title=a.get("title", "Weather Advisory"),
            description=a.get("description", "Normal conditions."),
            precautions=a.get("precautions", []),
            valid_from=a.get("valid_from"),
            valid_to=a.get("valid_to")
        ))
    
    # Check if there is any severe (warning/watch) or advisory alert
    has_severe = any(item.severity in ["warning", "watch"] for item in formatted)
    
    return ActiveAlertsResponse(
        has_active_alerts=has_severe,
        count=len(formatted),
        alerts=formatted,
        stale=False
    )

@router.get("/{alert_id}/precautions", response_model=AlertPrecautionsResponse)
async def get_alert_precautions(
    alert_id: str,
    alert_type: Optional[str] = Query(default="cyclone"),
    severity: Optional[str] = Query(default="warning"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    data = translation_service.get_precautions(alert_type)
    return AlertPrecautionsResponse(
        alert_id=alert_id,
        alert_type=alert_type,
        severity=severity,
        dos=data.get("dos", []),
        donts=data.get("donts", []),
        emergency_contacts=data.get("emergency_contacts", [])
    )
