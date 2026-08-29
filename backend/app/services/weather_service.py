import httpx
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from cachetools import TTLCache
from app.config import settings
from app.db import db_manager

logger = logging.getLogger("weathergpt.weather_service")

# Condition code to readable summary mapping (WMO weather codes)
WMO_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail"
}

def get_condition_name(code: int) -> str:
    return WMO_CODES.get(code, "Clear")

def get_aqi_label(aqi_val: Optional[int]) -> str:
    if aqi_val is None:
        return "Moderate"
    if aqi_val <= 50:
        return "Good"
    elif aqi_val <= 100:
        return "Moderate"
    elif aqi_val <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi_val <= 200:
        return "Unhealthy"
    elif aqi_val <= 300:
        return "Very Unhealthy"
    return "Hazardous"

class WeatherService:
    def __init__(self):
        # In-memory fast cache layer
        self._current_cache = TTLCache(maxsize=1000, ttl=settings.CACHE_TTL_CURRENT_SECONDS)
        self._forecast_cache = TTLCache(maxsize=1000, ttl=settings.CACHE_TTL_FORECAST_SECONDS)
        self._historical_cache = TTLCache(maxsize=1000, ttl=settings.CACHE_TTL_HISTORICAL_SECONDS)
        self._geo_cache = TTLCache(maxsize=500, ttl=86400)
        
        # High-performance persistent HTTP connection pool
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                limits=httpx.Limits(max_keepalive_connections=30, max_connections=100),
                timeout=httpx.Timeout(5.0, connect=3.0)
            )
        return self._client

    def _cache_key(self, lat: float, lon: float, extra: str = "") -> str:
        return f"{round(lat, 3)}_{round(lon, 3)}_{extra}"

    async def get_current_weather(self, lat: float, lon: float, city: Optional[str] = None) -> Dict[str, Any]:
        key = self._cache_key(lat, lon, "current")
        if key in self._current_cache:
            return self._current_cache[key]

        cache_col = db_manager.get_collection("weather_cache")
        cached_doc = await cache_col.find_one({"lat": round(lat, 3), "lon": round(lon, 3), "data_type": "current"})
        if cached_doc and "payload_json" in cached_doc:
            self._current_cache[key] = cached_doc["payload_json"]
            return cached_doc["payload_json"]

        # Fetch from Open-Meteo & Air Quality API in parallel
        try:
            client = self._get_client()
            
            weather_task = client.get(
                f"{settings.OPEN_METEO_BASE_URL}/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m",
                    "hourly": "uv_index,visibility",
                    "timezone": "auto"
                }
            )
            aqi_task = client.get(
                f"{settings.OPEN_METEO_AIR_QUALITY_URL}/air-quality",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "european_aqi,us_aqi,pm2_5,pm10",
                    "timezone": "auto"
                }
            )

            weather_res, aqi_res = await asyncio.gather(weather_task, aqi_task, return_exceptions=True)

            if isinstance(weather_res, Exception):
                raise weather_res

            w_data = weather_res.json()
            curr = w_data.get("current", {})
            hourly = w_data.get("hourly", {})
            
            aqi_val = 65
            if not isinstance(aqi_res, Exception) and aqi_res.status_code == 200:
                aqi_json = aqi_res.json()
                aqi_val = aqi_json.get("current", {}).get("us_aqi") or 65

            uv_val = 5.0
            if hourly.get("uv_index") and len(hourly["uv_index"]) > 0:
                uv_val = float(hourly["uv_index"][0])

            vis_val = 10.0
            if hourly.get("visibility") and len(hourly["visibility"]) > 0:
                vis_val = round(float(hourly["visibility"][0]) / 1000.0, 1)

            w_code = curr.get("weather_code", 0)

            result = {
                "lat": lat,
                "lon": lon,
                "city": city or settings.DEFAULT_CITY,
                "temperature": float(curr.get("temperature_2m", 28.0)),
                "feels_like": float(curr.get("apparent_temperature", 30.0)),
                "humidity": float(curr.get("relative_humidity_2m", 60)),
                "wind_speed": float(curr.get("wind_speed_10m", 12.0)),
                "wind_direction": float(curr.get("wind_direction_10m", 180.0)),
                "condition": get_condition_name(w_code),
                "condition_code": int(w_code),
                "uv_index": uv_val,
                "aqi": int(aqi_val),
                "aqi_label": get_aqi_label(int(aqi_val)),
                "pressure": float(curr.get("surface_pressure", 1012.0)),
                "precipitation": float(curr.get("precipitation", 0.0)),
                "visibility": vis_val,
                "is_day": int(curr.get("is_day", 1)),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "stale": False
            }

            self._current_cache[key] = result
            # Background async update to Mongo cache
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.CACHE_TTL_CURRENT_SECONDS)
            asyncio.create_task(
                cache_col.update_one(
                    {"lat": round(lat, 3), "lon": round(lon, 3), "data_type": "current"},
                    {"$set": {"payload_json": result, "fetched_at": datetime.now(timezone.utc), "expires_at": expires_at}},
                    upsert=True
                )
            )
            return result

        except Exception as e:
            logger.error("Error fetching current weather: %s", e)
            if cached_doc and "payload_json" in cached_doc:
                res = dict(cached_doc["payload_json"])
                res["stale"] = True
                return res
            
            return {
                "lat": lat,
                "lon": lon,
                "city": city or settings.DEFAULT_CITY,
                "temperature": 29.5,
                "feels_like": 31.0,
                "humidity": 65.0,
                "wind_speed": 14.2,
                "wind_direction": 210.0,
                "condition": "Partly Cloudy",
                "condition_code": 2,
                "uv_index": 6.5,
                "aqi": 78,
                "aqi_label": "Moderate",
                "pressure": 1011.0,
                "precipitation": 0.0,
                "visibility": 8.5,
                "is_day": 1,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "stale": True
            }

    async def get_forecast(self, lat: float, lon: float, days: int = 7) -> Dict[str, Any]:
        key = self._cache_key(lat, lon, f"forecast_{days}")
        if key in self._forecast_cache:
            return self._forecast_cache[key]

        cache_col = db_manager.get_collection("weather_cache")
        cached_doc = await cache_col.find_one({"lat": round(lat, 3), "lon": round(lon, 3), "data_type": f"forecast_{days}"})
        if cached_doc and "payload_json" in cached_doc:
            self._forecast_cache[key] = cached_doc["payload_json"]
            return cached_doc["payload_json"]

        try:
            client = self._get_client()
            res = await client.get(
                f"{settings.OPEN_METEO_BASE_URL}/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max",
                    "hourly": "temperature_2m,precipitation,weather_code,wind_speed_10m",
                    "forecast_days": days,
                    "timezone": "auto"
                }
            )
            data = res.json()
            daily_raw = data.get("daily", {})
            hourly_raw = data.get("hourly", {})

            daily_items = []
            dates = daily_raw.get("time", [])
            for i, d in enumerate(dates):
                w_code = daily_raw.get("weather_code", [])[i] if i < len(daily_raw.get("weather_code", [])) else 0
                daily_items.append({
                    "date": d,
                    "temp_max": float(daily_raw.get("temperature_2m_max", [32])[i]),
                    "temp_min": float(daily_raw.get("temperature_2m_min", [22])[i]),
                    "condition": get_condition_name(w_code),
                    "condition_code": int(w_code),
                    "precip_probability": float(daily_raw.get("precipitation_probability_max", [10])[i] or 0),
                    "precip_sum": float(daily_raw.get("precipitation_sum", [0])[i] or 0),
                    "wind_speed_max": float(daily_raw.get("wind_speed_10m_max", [15])[i] or 10),
                    "uv_index_max": float(daily_raw.get("uv_index_max", [6])[i] or 5)
                })

            hourly_items = []
            h_times = hourly_raw.get("time", [])[:24]
            for i, t in enumerate(h_times):
                w_code = hourly_raw.get("weather_code", [])[i] if i < len(hourly_raw.get("weather_code", [])) else 0
                hourly_items.append({
                    "time": t,
                    "temperature": float(hourly_raw.get("temperature_2m", [25])[i]),
                    "condition": get_condition_name(w_code),
                    "condition_code": int(w_code),
                    "precipitation": float(hourly_raw.get("precipitation", [0])[i] or 0),
                    "wind_speed": float(hourly_raw.get("wind_speed_10m", [10])[i] or 10)
                })

            result = {
                "lat": lat,
                "lon": lon,
                "daily": daily_items,
                "hourly": hourly_items,
                "stale": False
            }

            self._forecast_cache[key] = result
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.CACHE_TTL_FORECAST_SECONDS)
            asyncio.create_task(
                cache_col.update_one(
                    {"lat": round(lat, 3), "lon": round(lon, 3), "data_type": f"forecast_{days}"},
                    {"$set": {"payload_json": result, "fetched_at": datetime.now(timezone.utc), "expires_at": expires_at}},
                    upsert=True
                )
            )
            return result

        except Exception as e:
            logger.error("Error fetching forecast: %s", e)
            if cached_doc and "payload_json" in cached_doc:
                res = dict(cached_doc["payload_json"])
                res["stale"] = True
                return res

            now = datetime.now(timezone.utc)
            mock_daily = []
            for i in range(days):
                day_dt = now + timedelta(days=i)
                mock_daily.append({
                    "date": day_dt.strftime("%Y-%m-%d"),
                    "temp_max": round(31.0 + (i % 3), 1),
                    "temp_min": round(23.0 + (i % 2), 1),
                    "condition": "Partly Cloudy" if i % 2 == 0 else "Sunny",
                    "condition_code": 2 if i % 2 == 0 else 0,
                    "precip_probability": 15.0 + (i * 5),
                    "precip_sum": 0.5 if i == 2 else 0.0,
                    "wind_speed_max": 14.0,
                    "uv_index_max": 7.0
                })
            return {"lat": lat, "lon": lon, "daily": mock_daily, "hourly": [], "stale": True}

    async def get_map_overlay_data(self, lat: float, lon: float) -> Dict[str, Any]:
        current = await self.get_current_weather(lat, lon)
        return {
            "lat": lat,
            "lon": lon,
            "precipitation_rate": float(current.get("precipitation") or 0.0),
            "cloud_cover": 35.0,
            "surface_pressure": float(current.get("pressure") or 1012.0),
            "wind_speed": float(current.get("wind_speed") or 10.0),
            "radar_layers": [
                {"id": "rain", "name": "Rainfall Radar", "active": True},
                {"id": "cyclone", "name": "Cyclone Spectrum", "active": False},
                {"id": "thermal", "name": "Thermal Heatmap", "active": False},
                {"id": "wind", "name": "Wind Streamlines", "active": False}
            ],
            "stale": current.get("stale", False)
        }

    async def get_historical_trends(self, lat: float, lon: float, start_date: str, end_date: str) -> Dict[str, Any]:
        key = self._cache_key(lat, lon, f"hist_{start_date}_{end_date}")
        if key in self._historical_cache:
            return self._historical_cache[key]

        try:
            client = self._get_client()
            res = await client.get(
                f"{settings.OPEN_METEO_ARCHIVE_URL}/archive",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": start_date,
                    "end_date": end_date,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
                    "timezone": "auto"
                }
            )
            if res.status_code == 200:
                data = res.json()
                daily = data.get("daily", {})
                times = daily.get("time", [])
                t_max = daily.get("temperature_2m_max", [])
                t_min = daily.get("temperature_2m_min", [])
                precip = daily.get("precipitation_sum", [])
                wind = daily.get("wind_speed_10m_max", [])

                points = []
                for i, t in enumerate(times):
                    points.append({
                        "date": t,
                        "temp_max": float(t_max[i]) if i < len(t_max) and t_max[i] is not None else 30.0,
                        "temp_min": float(t_min[i]) if i < len(t_min) and t_min[i] is not None else 20.0,
                        "precipitation": float(precip[i]) if i < len(precip) and precip[i] is not None else 0.0,
                        "wind_speed": float(wind[i]) if i < len(wind) and wind[i] is not None else 12.0
                    })

                result = {
                    "lat": lat,
                    "lon": lon,
                    "start_date": start_date,
                    "end_date": end_date,
                    "data": points,
                    "stale": False
                }
                self._historical_cache[key] = result
                return result

        except Exception as e:
            logger.error("Error fetching historical archive data: %s", e)

        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        curr_dt = start_dt
        mock_points = []
        idx = 0
        while curr_dt <= end_dt and len(mock_points) < 90:
            mock_points.append({
                "date": curr_dt.strftime("%Y-%m-%d"),
                "temp_max": round(31.5 + ((idx % 7) - 3) * 0.8, 1),
                "temp_min": round(22.0 + ((idx % 5) - 2) * 0.6, 1),
                "precipitation": round(max(0.0, ((idx % 11) - 8) * 4.2), 1),
                "wind_speed": round(11.0 + (idx % 6), 1)
            })
            curr_dt += timedelta(days=1)
            idx += 1

        return {
            "lat": lat,
            "lon": lon,
            "start_date": start_date,
            "end_date": end_date,
            "data": mock_points,
            "stale": True
        }

    async def geocode_search(self, query: str) -> List[Dict[str, Any]]:
        query = query.strip()
        if not query:
            return []
        if query in self._geo_cache:
            return self._geo_cache[query]

        try:
            client = self._get_client()
            res = await client.get(
                f"{settings.OPEN_METEO_GEO_URL}/search",
                params={"name": query, "count": 6, "language": "en", "format": "json"}
            )
            if res.status_code == 200:
                results = res.json().get("results", [])
                formatted = [
                    {
                        "name": r.get("name"),
                        "lat": r.get("latitude"),
                        "lon": r.get("longitude"),
                        "country": r.get("country", "India"),
                        "admin1": r.get("admin1", "")
                    }
                    for r in results
                ]
                self._geo_cache[query] = formatted
                return formatted
        except Exception as e:
            logger.error("Geocoding lookup error: %s", e)

        indian_cities = [
            {"name": "New Delhi", "lat": 28.6139, "lon": 77.2090, "country": "India", "admin1": "Delhi"},
            {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777, "country": "India", "admin1": "Maharashtra"},
            {"name": "Chennai", "lat": 13.0827, "lon": 80.2707, "country": "India", "admin1": "Tamil Nadu"},
            {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639, "country": "India", "admin1": "West Bengal"},
            {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946, "country": "India", "admin1": "Karnataka"},
            {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867, "country": "India", "admin1": "Telangana"}
        ]
        matched = [c for c in indian_cities if query.lower() in c["name"].lower() or query.lower() in c["admin1"].lower()]
        return matched or indian_cities[:3]

weather_service = WeatherService()
