from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Onboarding & Auth ---
class OnboardingRequest(BaseModel):
    device_id: str
    language_code: str = "en"
    profession: str = "general"
    city: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class OnboardingResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# --- Weather ---
class CurrentWeatherResponse(BaseModel):
    lat: float
    lon: float
    city: Optional[str] = None
    temperature: float
    feels_like: float
    humidity: float
    wind_speed: float
    wind_direction: float
    condition: str
    condition_code: int
    uv_index: float
    aqi: Optional[int] = None
    aqi_label: Optional[str] = None
    pressure: float
    precipitation: float
    visibility: float
    is_day: int
    updated_at: datetime
    stale: bool = False

class DailyForecastItem(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    condition: str
    condition_code: int
    precip_probability: float
    precip_sum: float
    wind_speed_max: float
    uv_index_max: float

class HourlyForecastItem(BaseModel):
    time: str
    temperature: float
    condition: str
    condition_code: int
    precipitation: float
    wind_speed: float

class ForecastResponse(BaseModel):
    lat: float
    lon: float
    daily: List[DailyForecastItem]
    hourly: List[HourlyForecastItem]
    stale: bool = False

class WeatherMapDataResponse(BaseModel):
    lat: float
    lon: float
    precipitation_rate: float
    cloud_cover: float
    surface_pressure: float
    wind_speed: float
    radar_layers: List[Dict[str, Any]]
    stale: bool = False

# --- Chat & NL Query ---
class ChatQueryRequest(BaseModel):
    text: str
    lang: Optional[str] = "en"
    lat: Optional[float] = None
    lon: Optional[float] = None
    city: Optional[str] = None
    profession: Optional[str] = None

class ChatQueryResponse(BaseModel):
    query: str
    answer: str
    language_code: str
    intent: str
    provider_used: str
    grounded_data: Optional[Dict[str, Any]] = None
    suggested_followups: Optional[List[str]] = None

# --- Advisories ---
class AdvisoryTopic(BaseModel):
    title: str
    category: str
    summary: str
    recommendation: str
    severity: str = "normal"  # normal, attention, critical

class AdvisoryResponse(BaseModel):
    profession: str
    lat: float
    lon: float
    summary: str
    topics: List[AdvisoryTopic]
    generated_at: datetime
    stale: bool = False

# --- Research Metrics & Historical ---
class ResearchMetricItem(BaseModel):
    name: str
    code: str
    value: Any
    unit: str
    description: str
    plain_tooltip: str
    trend: Optional[str] = None

class ResearchMetricsResponse(BaseModel):
    category: str
    metrics: List[ResearchMetricItem]
    stale: bool = False

class HistoricalDataPoint(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    precipitation: float
    wind_speed: Optional[float] = None

class HistoricalResponse(BaseModel):
    lat: float
    lon: float
    start_date: str
    end_date: str
    data: List[HistoricalDataPoint]
    stale: bool = False

# --- Alerts ---
class AlertResponseItem(BaseModel):
    id: str
    lat: float
    lon: float
    region_name: str
    alert_type: str
    severity: str
    source: str
    title: str
    description: str
    precautions: List[str]
    valid_from: datetime
    valid_to: datetime

class ActiveAlertsResponse(BaseModel):
    has_active_alerts: bool
    count: int
    alerts: List[AlertResponseItem]
    stale: bool = False

class AlertPrecautionsResponse(BaseModel):
    alert_id: Optional[str] = None
    alert_type: str
    severity: str
    dos: List[str]
    donts: List[str]
    emergency_contacts: List[Dict[str, str]]

# --- Settings & Locations ---
class LocationCreateRequest(BaseModel):
    label: str
    lat: float
    lon: float
    is_default: bool = False

class GeocodeResultItem(BaseModel):
    name: str
    lat: float
    lon: float
    country: str
    admin1: Optional[str] = None
