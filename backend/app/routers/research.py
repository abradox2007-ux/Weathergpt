from fastapi import APIRouter, Query, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.schemas import ResearchMetricsResponse, HistoricalResponse, ResearchMetricItem
from app.services.weather_service import weather_service
from app.auth import require_auth
from app.config import settings

router = APIRouter(prefix="/api/research", tags=["Climate Research"])

@router.get("/metrics", response_model=ResearchMetricsResponse)
async def get_research_metrics(
    category: str = Query(default="atmospheric", description="Category: atmospheric | moisture | energy | long_term"),
    lat: float = Query(default=settings.DEFAULT_LAT, description="Latitude"),
    lon: float = Query(default=settings.DEFAULT_LON, description="Longitude"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    current = await weather_service.get_current_weather(lat, lon)
    category = category.lower().replace(" ", "_")

    temp = current.get("temperature", 28.0)
    hum = current.get("humidity", 60.0)
    press = current.get("pressure", 1012.0)
    wind = current.get("wind_speed", 12.0)
    uv = current.get("uv_index", 5.0)
    precip = current.get("precipitation", 0.0)

    metrics: List[ResearchMetricItem] = []

    if category == "moisture":
        # Moisture & Water category
        dew_point = round(temp - ((100 - hum) / 5), 1)
        vapor_pressure = round(6.11 * (10 ** ((7.5 * temp) / (237.3 + temp))) * (hum / 100), 2)
        metrics = [
            ResearchMetricItem(
                name="Dew Point Temperature",
                code="DEW_PT",
                value=f"{dew_point}",
                unit="°C",
                description="Temperature to which air must be cooled to become saturated with water vapor.",
                plain_tooltip="When air temperature reaches this level, fog, dew, or condensation will form immediately.",
                trend="+0.3°C from dawn"
            ),
            ResearchMetricItem(
                name="Relative Humidity",
                code="REL_HUM",
                value=f"{hum}",
                unit="%",
                description="Percentage of moisture currently in the air compared to maximum possible.",
                plain_tooltip="Higher values (>80%) make sweat evaporate slowly, increasing discomfort and crop fungal risks.",
                trend="Stable"
            ),
            ResearchMetricItem(
                name="Vapor Pressure",
                code="VAP_PRESS",
                value=f"{vapor_pressure}",
                unit="hPa",
                description="Partial pressure exerted by water vapor molecules in ambient air.",
                plain_tooltip="Direct driver of plant transpiration and soil evaporation rates.",
                trend="Normal"
            ),
            ResearchMetricItem(
                name="Precipitable Water Column",
                code="PW_COL",
                value=f"{round(18.5 + (hum * 0.25), 1)}",
                unit="kg/m²",
                description="Total atmospheric water vapor integrated from ground to stratosphere.",
                plain_tooltip="Indicates potential storm intensity if atmospheric updrafts trigger rain clouds.",
                trend="Moderate"
            )
        ]

    elif category == "energy":
        # Energy & Radiation category
        solar_irradiance = round(max(0.0, (uv * 115.0) if current.get("is_day", 1) == 1 else 0.0), 1)
        thermal_flux = round(380.0 + (temp * 3.2), 1)
        metrics = [
            ResearchMetricItem(
                name="Solar Direct Irradiance",
                code="SOL_GHI",
                value=f"{solar_irradiance}",
                unit="W/m²",
                description="Global Horizontal Solar Irradiance reaching the surface.",
                plain_tooltip="Measures raw sunlight energy available for solar PV panels and photosynthesis.",
                trend="Peak diurnal curve"
            ),
            ResearchMetricItem(
                name="UV Index Rating",
                code="UVI",
                value=f"{uv}",
                unit="Scale 0-12",
                description="Standard international measurement of erythemal UV radiation.",
                plain_tooltip="Values over 6.0 require sunglasses, sunscreen, and shaded head protection.",
                trend="High midday"
            ),
            ResearchMetricItem(
                name="Net Thermal Longwave Flux",
                code="TH_FLUX",
                value=f"{thermal_flux}",
                unit="W/m²",
                description="Infrared heat radiation re-emitted by the Earth's ground surface.",
                plain_tooltip="Dictates how quickly the ground cools down after sunset.",
                trend="Rising"
            ),
            ResearchMetricItem(
                name="Photosynthetically Active Radiation",
                code="PAR",
                value=f"{round(solar_irradiance * 0.45, 1)}",
                unit="μmol/m²/s",
                description="Spectral waveband of solar radiation (400–700 nm) used by green plants.",
                plain_tooltip="Crucial for calculating crop biomass accumulation and agricultural yields.",
                trend="Optimal"
            )
        ]

    elif category == "long_term":
        # Long-Term Indicators
        metrics = [
            ResearchMetricItem(
                name="Temperature Anomaly (30y Baseline)",
                code="TEMP_ANOM",
                value="+1.18",
                unit="°C",
                description="Deviation of current monthly mean from 1991-2020 climatological normal.",
                plain_tooltip="Shows how much warmer the current season is compared to the historical 30-year average.",
                trend="Warming anomaly"
            ),
            ResearchMetricItem(
                name="Monsoon Rainfall Departure",
                code="MON_DEP",
                value="+4.2",
                unit="%",
                description="Cumulative seasonal precipitation departure from long period average (LPA).",
                plain_tooltip="Evaluates whether regional monsoon precipitation is in normal, deficit, or excess category.",
                trend="Normal LPA"
            ),
            ResearchMetricItem(
                name="Palmer Drought Severity Index",
                code="PDSI",
                value="+0.4",
                unit="Index",
                description="Standardized meteorological drought index combining temp and water balance.",
                plain_tooltip="Values between -1.0 and +1.0 indicate near-normal balanced soil moisture conditions.",
                trend="Incipient wet"
            ),
            ResearchMetricItem(
                name="Urban Heat Island Intensity",
                code="UHII",
                value="+2.4",
                unit="°C",
                description="Thermal disparity between urban core and surrounding rural buffer zone.",
                plain_tooltip="Excess heat trapped by asphalt, concrete buildings, and vehicular emissions.",
                trend="Elevated"
            )
        ]

    else:
        # Default: Atmospheric Conditions
        air_density = round(press / (2.87 * (temp + 273.15)), 3)
        metrics = [
            ResearchMetricItem(
                name="Sea Level Pressure (QNH)",
                code="SLP",
                value=f"{press}",
                unit="hPa",
                description="Atmospheric surface pressure adjusted to mean sea level.",
                plain_tooltip="Sudden drop (>3 hPa in 3 hours) indicates approaching low-pressure depression or squall.",
                trend="Steady"
            ),
            ResearchMetricItem(
                name="Air Density",
                code="AIR_RHO",
                value=f"{air_density}",
                unit="kg/m³",
                description="Mass of air per unit volume at surface level.",
                plain_tooltip="Affects aircraft lift, wind turbine power generation, and engine air intake.",
                trend="Standard"
            ),
            ResearchMetricItem(
                name="Wind Shear Potential",
                code="W_SHEAR",
                value=f"{round(wind * 0.3, 1)}",
                unit="kt/1000ft",
                description="Vector difference in wind velocity over vertical atmospheric layers.",
                plain_tooltip="Essential metric for flight takeoff/landing safety and wind turbine mechanical stress.",
                trend="Low"
            ),
            ResearchMetricItem(
                name="Boundary Layer Inversion Height",
                code="PBL_H",
                value="850",
                unit="meters",
                description="Height of planetary boundary layer containing surface emissions and pollutants.",
                plain_tooltip="Lower height traps vehicular smoke and winter smog near ground level.",
                trend="Seasonal"
            )
        ]

    return ResearchMetricsResponse(
        category=category,
        metrics=metrics,
        stale=current.get("stale", False)
    )

@router.get("/historical", response_model=HistoricalResponse)
async def get_historical_research(
    lat: float = Query(default=settings.DEFAULT_LAT, description="Latitude"),
    lon: float = Query(default=settings.DEFAULT_LON, description="Longitude"),
    start_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    now = datetime.now(timezone.utc)
    if not end_date:
        end_date = (now - timedelta(days=5)).strftime("%Y-%m-%d")
    if not start_date:
        start_date = (now - timedelta(days=35)).strftime("%Y-%m-%d")

    res = await weather_service.get_historical_trends(
        lat=lat,
        lon=lon,
        start_date=start_date,
        end_date=end_date
    )
    return HistoricalResponse(**res)
