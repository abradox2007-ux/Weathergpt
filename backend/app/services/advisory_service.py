from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from cachetools import TTLCache
from app.services.weather_service import weather_service
from app.db import db_manager

class AdvisoryService:
    def __init__(self):
        self._cache = TTLCache(maxsize=500, ttl=600)  # 10 minute memory cache

    async def get_profession_advisory(self, profession: str, lat: float, lon: float, lang: str = "en") -> Dict[str, Any]:
        cache_key = f"{profession}_{round(lat, 3)}_{round(lon, 3)}_{lang}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        profession = profession.lower().replace(" ", "_")
        current = await weather_service.get_current_weather(lat, lon)
        forecast = await weather_service.get_forecast(lat, lon, days=3)

        temp = current.get("temperature", 28.0)
        humidity = current.get("humidity", 60.0)
        wind = current.get("wind_speed", 12.0)
        precip = current.get("precipitation", 0.0)
        uv = current.get("uv_index", 5.0)
        aqi = current.get("aqi", 70)
        cond = current.get("condition", "Clear")

        topics: List[Dict[str, Any]] = []
        summary = ""

        if profession == "farmer":
            summary = f"Agronomic advisory for {current.get('city', 'your area')}: {cond} conditions with {temp}°C and {humidity}% humidity."
            # Crop Irrigation
            if precip > 5.0 or any(d.get("precip_probability", 0) > 60 for d in forecast.get("daily", [])[:2]):
                topics.append({
                    "title": "Irrigation Scheduling",
                    "category": "Water Management",
                    "summary": "High precipitation probability expected over the next 48 hours.",
                    "recommendation": "Postpone artificial furrow irrigation. Ensure surface drainage channels in paddy and cotton fields are cleared to avoid root rot.",
                    "severity": "attention"
                })
            else:
                topics.append({
                    "title": "Irrigation Scheduling",
                    "category": "Water Management",
                    "summary": f"Dry weather conditions with evapotranspiration rate at approx {round(temp * 0.15, 1)} mm/day.",
                    "recommendation": "Maintain optimal light sprinkler or drip irrigation during early morning hours to conserve soil moisture.",
                    "severity": "normal"
                })

            # Chemical Spraying / Pest
            if wind > 18.0 or precip > 1.0:
                topics.append({
                    "title": "Crop Protection & Spraying",
                    "category": "Pest & Fertilizer",
                    "summary": f"Current wind speeds ({round(wind, 1)} km/h) exceed ideal spraying envelope.",
                    "recommendation": "Do not spray foliar fertilizers or pesticides today to prevent chemical drift and wash-off.",
                    "severity": "critical" if wind > 25.0 else "attention"
                })
            else:
                topics.append({
                    "title": "Pesticide & Fertilizer Spraying",
                    "category": "Pest & Fertilizer",
                    "summary": f"Calm winds ({round(wind, 1)} km/h) and clear conditions.",
                    "recommendation": "Favorable window for pesticide, micronutrient, and herbicide application before 11:00 AM.",
                    "severity": "normal"
                })

            # Harvesting & Post-Harvest
            topics.append({
                "title": "Harvesting & Grain Storage",
                "category": "Harvest Operations",
                "summary": f"Relative atmospheric humidity currently at {round(humidity)}%.",
                "recommendation": "Sun-dry harvested grains to below 12% moisture content before bagging to prevent fungal aflatoxin contamination.",
                "severity": "normal"
            })

        elif profession == "fisherman":
            summary = f"Maritime coastal advisory: Wind {round(wind, 1)} km/h, Sea state moderate with {cond} sky."
            if wind >= 40.0:
                topics.append({
                    "title": "High Sea Warning",
                    "category": "Vessel Safety",
                    "summary": f"Strong squally surface winds ({round(wind, 1)} km/h) and rough swell.",
                    "recommendation": "Fishermen are strictly advised NOT to venture into deep sea or coastal waters. Return motorized catamarans to safe harbor.",
                    "severity": "critical"
                })
            elif wind >= 25.0:
                topics.append({
                    "title": "Coastal Swell & Sea State",
                    "category": "Navigation",
                    "summary": f"Moderate chop with wave heights estimated between 1.8m – 2.5m.",
                    "recommendation": "Operate mechanised boats with caution within 10 nautical miles. Keep GPS beacon and VHF Channel 16 active.",
                    "severity": "attention"
                })
            else:
                topics.append({
                    "title": "Fishing Operations Window",
                    "category": "Catch Opportunity",
                    "summary": f"Calm sea conditions ({round(wind, 1)} km/h wind). Sea surface temperature favorable.",
                    "recommendation": "Optimal fishing conditions across inshore and pelagic zones. Good visibility across offshore routes.",
                    "severity": "normal"
                })

            topics.append({
                "title": "Harbour Entry & Tidal Timing",
                "category": "Port Operations",
                "summary": "Stable barometric pressure at " + str(round(current.get("pressure", 1012))) + " hPa.",
                "recommendation": "Safe tidal window available for docking and fish landing operations throughout daytime.",
                "severity": "normal"
            })

        elif profession == "aviation":
            summary = f"METAR/Aviation Briefing: Temp {temp}°C, Wind {round(wind, 1)} km/h @ {round(current.get('wind_direction', 180))}°, Vis {current.get('visibility', 10)} km."
            topics.append({
                "title": "En-route Visibility & Cloud Ceiling",
                "category": "Flight Operations",
                "summary": f"Surface horizontal visibility is {current.get('visibility', 10)} km.",
                "recommendation": "VFR (Visual Flight Rules) conditions maintained. No low-level fog or stratus cloud ceiling hazards reported.",
                "severity": "normal" if current.get("visibility", 10) >= 5 else "attention"
            })
            topics.append({
                "title": "Convective Activity & Turbulence",
                "category": "Atmospheric Dynamics",
                "summary": f"Cloud condition is {cond}.",
                "recommendation": "Light turbulence expected in lower boundary layer up to FL050 during afternoon solar heating.",
                "severity": "normal"
            })

        elif profession == "marine":
            summary = f"Commercial Marine Transit Advisory: Barometer {current.get('pressure', 1012)} hPa, Wind {round(wind, 1)} km/h."
            topics.append({
                "title": "Swell & Navigational Channel",
                "category": "Vessel Routing",
                "summary": f"Surface wind at {round(wind, 1)} km/h with {cond} weather.",
                "recommendation": "Maintain standard cruising speeds. Bunker fuel consumption within optimal baseline range.",
                "severity": "normal"
            })
            topics.append({
                "title": "Cargo Deck Safety",
                "category": "Deck Operations",
                "summary": f"Atmospheric pressure steady at {current.get('pressure', 1012)} hPa.",
                "recommendation": "Verify lashings on container tiers. Ensure bilge pumps and hatch covers are checked before night watch.",
                "severity": "normal"
            })

        elif profession == "urban_planning":
            summary = f"City Infrastructure & Drainage Advisory for {current.get('city', 'Metro Area')}."
            topics.append({
                "title": "Stormwater & Drainage Capacity",
                "category": "Urban Drainage",
                "summary": f"Current precipitation: {precip} mm/h.",
                "recommendation": "Ensure low-lying road culverts and pumping stations are clear of plastic debris before sudden convective downpours.",
                "severity": "attention" if precip > 2.0 else "normal"
            })
            topics.append({
                "title": "Urban Heat Island & Air Index",
                "category": "Public Health",
                "summary": f"Ambient Temperature {temp}°C, AQI {aqi} ({current.get('aqi_label', 'Moderate')}).",
                "recommendation": "Activate public cooling misting zones and maintain civic park tree canopy hydration during peak afternoon hours.",
                "severity": "attention" if temp > 38.0 or aqi > 150 else "normal"
            })

        else: # general
            summary = f"Daily lifestyle and outdoor comfort index for {current.get('city', 'your area')}."
            topics.append({
                "title": "Daily Commute & Travel",
                "category": "Daily Routine",
                "summary": f"{cond} sky with {temp}°C (Feels like {round(current.get('feels_like', temp))}°C).",
                "recommendation": "Carry an umbrella if venturing out in the afternoon." if precip > 0 or "Rain" in cond else "Pleasant conditions for outdoor travel and daily commute.",
                "severity": "normal"
            })
            topics.append({
                "title": "Health & Sun Protection",
                "category": "Wellness",
                "summary": f"UV Index: {uv} | Air Quality: {aqi} ({current.get('aqi_label', 'Moderate')}).",
                "recommendation": "Apply SPF30+ sunscreen and stay hydrated." if uv >= 6.0 else "Comfortable solar radiation levels.",
                "severity": "attention" if uv >= 8.0 or aqi > 150 else "normal"
            })

        result = {
            "profession": profession,
            "lat": lat,
            "lon": lon,
            "summary": summary,
            "topics": topics,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "stale": current.get("stale", False)
        }

        # Cache advisory in database
        adv_col = db_manager.get_collection("advisories")
        await adv_col.update_one(
            {"profession_id": profession, "lat": round(lat, 3), "lon": round(lon, 3)},
            {"$set": {**result, "generated_at": datetime.now(timezone.utc)}},
            upsert=True
        )

        self._cache[cache_key] = result
        return result

advisory_service = AdvisoryService()
