from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
import uuid
from app.schemas import OnboardingRequest, OnboardingResponse
from app.models import UserDocument, LocationItem, UserSettings
from app.db import db_manager
from app.auth import create_access_token
from app.config import settings

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])

@router.post("", response_model=OnboardingResponse)
async def onboard_user(payload: OnboardingRequest):
    users_col = db_manager.get_collection("users")
    
    device_id = payload.device_id.strip()
    if not device_id:
        device_id = str(uuid.uuid4())

    existing_user = await users_col.find_one({"device_id": device_id})

    lat = payload.lat or settings.DEFAULT_LAT
    lon = payload.lon or settings.DEFAULT_LON
    city = payload.city or settings.DEFAULT_CITY

    if existing_user:
        # Update user's language and profession if provided
        update_fields = {
            "language_code": payload.language_code,
            "profession": payload.profession.lower(),
            "default_city": city
        }
        await users_col.update_one({"device_id": device_id}, {"$set": update_fields})
        user_data = await users_col.find_one({"device_id": device_id})
        user_id = str(user_data.get("_id") or user_data.get("id"))
    else:
        initial_location = LocationItem(
            label=city,
            lat=lat,
            lon=lon,
            is_default=True
        )
        new_user = UserDocument(
            device_id=device_id,
            language_code=payload.language_code,
            profession=payload.profession.lower(),
            default_city=city,
            settings=UserSettings(),
            locations=[initial_location]
        )
        doc_dict = new_user.model_dump(by_alias=True)
        await users_col.insert_one(doc_dict)
        user_data = doc_dict
        user_id = str(user_data["_id"])

    # Issue JWT keyed to device_id
    token_payload = {
        "sub": user_id,
        "device_id": device_id,
        "language_code": payload.language_code,
        "profession": payload.profession.lower()
    }
    token = create_access_token(token_payload)

    # Clean object for JSON return
    clean_user = dict(user_data)
    clean_user["id"] = user_id
    if "_id" in clean_user:
        clean_user["_id"] = str(clean_user["_id"])

    return OnboardingResponse(
        access_token=token,
        token_type="bearer",
        user=clean_user
    )
