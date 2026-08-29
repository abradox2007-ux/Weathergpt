from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime, timezone
import uuid
from app.models import UserSettings, LocationItem
from app.schemas import LocationCreateRequest
from app.db import db_manager
from app.auth import require_auth

router = APIRouter(prefix="/api", tags=["Settings & Locations"])

@router.get("/settings", response_model=UserSettings)
async def get_settings(auth: Dict[str, Any] = Depends(require_auth)):
    device_id = auth.get("device_id")
    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"device_id": device_id})
    if not user:
        return UserSettings()
    return UserSettings(**user.get("settings", {}))

@router.put("/settings", response_model=UserSettings)
async def update_settings(payload: UserSettings, auth: Dict[str, Any] = Depends(require_auth)):
    device_id = auth.get("device_id")
    users_col = db_manager.get_collection("users")
    
    settings_dict = payload.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc)
    
    await users_col.update_one(
        {"device_id": device_id},
        {"$set": {"settings": settings_dict}},
        upsert=True
    )
    return payload

@router.get("/locations", response_model=List[Dict[str, Any]])
async def get_saved_locations(auth: Dict[str, Any] = Depends(require_auth)):
    device_id = auth.get("device_id")
    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"device_id": device_id})
    if not user:
        return [
            {"id": "loc_1", "label": "New Delhi", "lat": 28.6139, "lon": 77.2090, "is_default": True},
            {"id": "loc_2", "label": "Mumbai", "lat": 19.0760, "lon": 72.8777, "is_default": False},
            {"id": "loc_3", "label": "Chennai", "lat": 13.0827, "lon": 80.2707, "is_default": False}
        ]
    return user.get("locations", [])

@router.post("/locations")
async def add_location(payload: LocationCreateRequest, auth: Dict[str, Any] = Depends(require_auth)):
    device_id = auth.get("device_id")
    users_col = db_manager.get_collection("users")
    
    new_loc = LocationItem(
        label=payload.label,
        lat=payload.lat,
        lon=payload.lon,
        is_default=payload.is_default
    ).model_dump()
    
    await users_col.update_one(
        {"device_id": device_id},
        {"$push": {"locations": new_loc}},
        upsert=True
    )
    return {"message": "Location added successfully", "location": new_loc}

@router.delete("/locations/{location_id}")
async def delete_location(location_id: str, auth: Dict[str, Any] = Depends(require_auth)):
    device_id = auth.get("device_id")
    users_col = db_manager.get_collection("users")
    
    await users_col.update_one(
        {"device_id": device_id},
        {"$pull": {"locations": {"id": location_id}}}
    )
    return {"message": "Location deleted successfully"}
