import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.services.weather_service import weather_service
from app.services.translation_service import translation_service
from app.db import db_manager

logger = logging.getLogger("weathergpt.alerts_service")

class AlertsService:
    async def evaluate_active_alerts(self, lat: float, lon: float, city: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Derives real-time disaster and severe weather alerts based on live meteorological data
        and thresholds for Indian subcontinent climatic conditions.
        """
        alerts_col = db_manager.get_collection("alerts")
        current = await weather_service.get_current_weather(lat, lon, city)
        forecast = await weather_service.get_forecast(lat, lon, days=3)

        temp = current.get("temperature", 28.0)
        wind = current.get("wind_speed", 12.0)
        precip = current.get("precipitation", 0.0)
        code = current.get("condition_code", 0)
        aqi = current.get("aqi", 60)

        derived_alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)
        valid_until = now + timedelta(hours=18)
        region = city or "Local Coastal/Inland Region"

        # 1. Cyclone & High Wind Squall Alert (Wind > 45 km/h)
        if wind >= 55.0:
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "cyclone",
                "severity": "warning" if wind >= 75.0 else "watch",
                "source": "derived",
                "title": "Severe Squall & Gale Warning",
                "description": f"Gale winds gusting up to {round(wind, 1)} km/h detected in the area. High risk of tree falls and coastal rough seas.",
                "precautions": translation_service.get_precautions("cyclone")["dos"],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })
        elif wind >= 38.0:
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "cyclone",
                "severity": "advisory",
                "source": "derived",
                "title": "High Coastal Wind Advisory",
                "description": f"Strong surface winds around {round(wind, 1)} km/h expected. Small fishing craft advised caution.",
                "precautions": translation_service.get_precautions("cyclone")["dos"][:3],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })

        # 2. Extreme Rainfall & Flood Alert
        max_daily_precip = max([d.get("precip_sum", 0) for d in forecast.get("daily", [])] + [precip])
        if max_daily_precip >= 65.0 or precip >= 25.0:
            severity = "warning" if (max_daily_precip >= 115.0 or precip >= 50.0) else "watch"
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "flood",
                "severity": severity,
                "source": "derived",
                "title": "Heavy Inundation & Cloudburst Risk",
                "description": f"Intense precipitation accumulation ({round(max_daily_precip, 1)} mm) likely to trigger localized waterlogging.",
                "precautions": translation_service.get_precautions("flood")["dos"],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })

        # 3. Heatwave Warning (Temp > 40°C in India or Feels-like > 43°C)
        if temp >= 41.0 or current.get("feels_like", 0) >= 44.0:
            severity = "warning" if temp >= 44.0 else "watch"
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "heat",
                "severity": severity,
                "source": "derived",
                "title": "Severe Heatwave (Loo) Warning",
                "description": f"Maximum ambient temperature soaring to {round(temp, 1)}°C (Feels like {round(current.get('feels_like', 0), 1)}°C). High risk of heat exhaustion.",
                "precautions": translation_service.get_precautions("heat")["dos"],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })
        elif temp >= 37.5:
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "heat",
                "severity": "advisory",
                "source": "derived",
                "title": "High Heat Index Advisory",
                "description": f"Warm weather conditions with daytime temperature reaching {round(temp, 1)}°C. Stay hydrated.",
                "precautions": translation_service.get_precautions("heat")["dos"][:3],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })

        # 4. Thunderstorm / Lightning Activity
        if code in [95, 96, 99]:
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "storm",
                "severity": "warning" if code in [96, 99] else "watch",
                "source": "derived",
                "title": "Severe Thunderstorm & Lightning Alert",
                "description": "Active convective thunderstorm cells with potential cloud-to-ground lightning and localized gusty squalls.",
                "precautions": translation_service.get_precautions("storm")["dos"],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })

        # 5. Cold Wave Alert (Temp < 9°C in plains)
        if temp <= 8.0:
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "cold",
                "severity": "watch" if temp <= 4.0 else "advisory",
                "source": "derived",
                "title": "Cold Wave & Frost Condition",
                "description": f"Minimum temperature plunging to {round(temp, 1)}°C with dense morning radiation fog.",
                "precautions": translation_service.get_precautions("cold")["dos"],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })

        # If no severe hazard is triggered, provide an active baseline seasonal watch/advisory
        if not derived_alerts:
            derived_alerts.append({
                "lat": lat,
                "lon": lon,
                "region_name": region,
                "alert_type": "general",
                "severity": "advisory",
                "source": "derived",
                "title": "Moderate Seasonal Weather Advisory",
                "description": f"Normal atmospheric conditions observed ({get_condition_summary(code)}, {round(temp, 1)}°C, Humidity {round(current.get('humidity', 0))}%, AQI {aqi}). No severe alerts active.",
                "precautions": translation_service.get_precautions("general")["dos"],
                "valid_from": now.isoformat(),
                "valid_to": valid_until.isoformat()
            })

        # Save to Mongo / cache
        for a in derived_alerts:
            a["_id"] = f"{round(lat, 3)}_{round(lon, 3)}_{a['alert_type']}"
            await alerts_col.update_one({"_id": a["_id"]}, {"$set": a}, upsert=True)

        return derived_alerts

    def get_precautions_for_type(self, alert_type: str) -> Dict[str, Any]:
        return translation_service.get_precautions(alert_type)

def get_condition_summary(code: int) -> str:
    from app.services.weather_service import get_condition_name
    return get_condition_name(code)

alerts_service = AlertsService()
