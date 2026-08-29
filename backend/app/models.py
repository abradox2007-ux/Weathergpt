from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
import uuid

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class UserSettings(BaseModel):
    unit_temp: str = "celsius"        # celsius, fahrenheit
    unit_wind: str = "kmh"            # kmh, ms, mph, kn
    unit_pressure: str = "hPa"        # hPa, inHg, mmHg
    unit_precip: str = "mm"           # mm, inch
    unit_distance: str = "km"         # km, mile
    theme: str = "system"             # system, light, dark
    notif_severe: bool = True
    notif_daily_digest: bool = True
    notif_realtime_precip: bool = True
    notif_status_bar: bool = True
    location_permission: bool = True
    updated_at: datetime = Field(default_factory=utc_now)

class LocationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    lat: float
    lon: float
    is_default: bool = False
    created_at: datetime = Field(default_factory=utc_now)

class UserDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    device_id: str
    language_code: str = "en"
    profession: str = "general"
    default_city: str = "New Delhi"
    settings: UserSettings = Field(default_factory=UserSettings)
    locations: List[LocationItem] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)

class ChatHistoryDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    user_id: str
    role: str                       # user | assistant
    message_text: str
    language_code: str = "en"
    intent_detected: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

class WeatherCacheDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    lat: float
    lon: float
    data_type: str                  # current | forecast | historical | air_quality
    payload_json: Dict[str, Any]
    fetched_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime

class AlertDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    lat: float
    lon: float
    region_name: str
    alert_type: str                 # cyclone | flood | heat | cold | storm | wind | rainfall
    severity: str                   # advisory | watch | warning
    source: str = "derived"         # imd | derived
    title: str
    description: str
    precautions: List[str] = Field(default_factory=list)
    valid_from: datetime
    valid_to: datetime
    created_at: datetime = Field(default_factory=utc_now)

class ProfessionDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    name: str                       # farmer | fisherman | aviation | marine | urban_planning | general
    advisory_prompt_template: str

class AdvisoryDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    user_id: Optional[str] = None
    profession_id: str
    lat: float
    lon: float
    content_text: str
    topics: Optional[List[Dict[str, Any]]] = None
    generated_at: datetime = Field(default_factory=utc_now)

class ResearchMetricsCacheDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    lat: float
    lon: float
    metric_category: str            # atmospheric | moisture | energy | long_term
    payload_json: Dict[str, Any]
    fetched_at: datetime = Field(default_factory=utc_now)
    expires_at: Optional[datetime] = None
