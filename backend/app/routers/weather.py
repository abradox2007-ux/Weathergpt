from fastapi import APIRouter, Query, Depends
from typing import Optional, List, Dict, Any
from app.schemas import (
    CurrentWeatherResponse,
    ForecastResponse,
    WeatherMapDataResponse,
    GeocodeResultItem
)
from app.services.weather_service import weather_service
from app.auth import require_auth
from app.config import settings

router = APIRouter(prefix="/api/weather", tags=["Weather"])

@router.get("/current", response_model=CurrentWeatherResponse)
async def get_current_weather(
    lat: float = Query(default=settings.DEFAULT_LAT, description="Latitude"),
    lon: float = Query(default=settings.DEFAULT_LON, description="Longitude"),
    city: Optional[str] = Query(default=None, description="City name override"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    return await weather_service.get_current_weather(lat=lat, lon=lon, city=city)

@router.get("/forecast", response_model=ForecastResponse)
async def get_weather_forecast(
    lat: float = Query(default=settings.DEFAULT_LAT, description="Latitude"),
    lon: float = Query(default=settings.DEFAULT_LON, description="Longitude"),
    days: int = Query(default=7, ge=1, le=14, description="Forecast days"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    return await weather_service.get_forecast(lat=lat, lon=lon, days=days)

@router.get("/map", response_model=WeatherMapDataResponse)
async def get_weather_map(
    lat: float = Query(default=settings.DEFAULT_LAT, description="Latitude"),
    lon: float = Query(default=settings.DEFAULT_LON, description="Longitude"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    return await weather_service.get_map_overlay_data(lat=lat, lon=lon)

@router.get("/search", response_model=List[GeocodeResultItem])
async def search_location(
    query: str = Query(..., min_length=1, description="Location search query")
):
    return await weather_service.geocode_search(query=query)
