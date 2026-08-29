import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.db import db_manager
from app.services.weather_service import weather_service
from app.services.alerts_service import alerts_service
from app.routers import (
    onboarding,
    weather,
    chat,
    advisory,
    research,
    alerts,
    settings as settings_router
)

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("weathergpt.main")

# Background job scheduler
scheduler = AsyncIOScheduler()

async def background_weather_refresh():
    """Periodic task to keep major Indian hub weather & alert caches warm."""
    logger.info("Executing background weather & alerts refresh job...")
    hubs = [
        {"lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
        {"lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
        {"lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
        {"lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
        {"lat": 12.9716, "lon": 77.5946, "city": "Bengaluru"}
    ]
    for hub in hubs:
        try:
            await weather_service.get_current_weather(hub["lat"], hub["lon"], hub["city"])
            await alerts_service.evaluate_active_alerts(hub["lat"], hub["lon"], hub["city"])
        except Exception as e:
            logger.warning("Background refresh failed for %s: %s", hub["city"], e)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logger.info("Starting up %s backend service...", settings.APP_NAME)
    await db_manager.connect()
    
    # Start APScheduler periodic jobs
    scheduler.add_job(background_weather_refresh, "interval", minutes=15, id="weather_refresh_job")
    scheduler.start()
    logger.info("APScheduler initialized and running.")
    
    yield
    
    # --- Shutdown ---
    logger.info("Shutting down %s...", settings.APP_NAME)
    if scheduler.running:
        scheduler.shutdown(wait=False)
    await db_manager.close()

app = FastAPI(
    title="WeatherGPT API",
    description="Conversational AI Weather Intelligence Platform for India",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled Exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Fallback telemetry active."}
    )

# Mount Routers
app.include_router(onboarding.router)
app.include_router(weather.router)
app.include_router(chat.router)
app.include_router(advisory.router)
app.include_router(research.router)
app.include_router(alerts.router)
app.include_router(settings_router.router)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "llm_provider": settings.LLM_PROVIDER,
        "database": "MongoDB" if not db_manager.is_in_memory else "In-Memory Async Document DB",
        "documentation": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
