from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "WeatherGPT"
    ENV: str = "development"
    DEBUG: bool = True
    
    # MongoDB Configuration
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "weathergpt_db"
    
    # JWT Authentication
    JWT_SECRET: str = "weathergpt_sih_hackathon_super_secret_key_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 365
    
    # LLM Settings
    LLM_PROVIDER: str = "groq"  # groq | gemini | openai | mock
    GEMINI_API_KEY: Optional[str] = "AQ.Ab8RN6LyYxbjGfQKWQUMA9EQNfG35-v5Y5WN1k3AB4fwrpUGlA"
    GROQ_API_KEY: Optional[str] = "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"
    OPENAI_API_KEY: Optional[str] = None
    
    # CARTO API Configuration
    CARTO_API_ENDPOINT: str = "https://gcp-asia-northeast1.api.carto.com/mcp/ac_dp7wr30d"
    CARTO_ACCOUNT_ID: str = "ac_dp7wr30d"
    OPENWEATHERMAP_API_KEY: str = "a946a50a598bf594493fa0de5aad65e3"
    
    # External APIs
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    OPEN_METEO_GEO_URL: str = "https://geocoding-api.open-meteo.com/v1"
    OPEN_METEO_ARCHIVE_URL: str = "https://archive-api.open-meteo.com/v1"
    OPEN_METEO_AIR_QUALITY_URL: str = "https://air-quality-api.open-meteo.com/v1"
    
    # Cache settings
    CACHE_TTL_CURRENT_SECONDS: int = 600       # 10 minutes
    CACHE_TTL_FORECAST_SECONDS: int = 900      # 15 minutes
    CACHE_TTL_HISTORICAL_SECONDS: int = 86400  # 24 hours
    CACHE_TTL_ALERTS_SECONDS: int = 900        # 15 minutes
    
    # Defaults
    DEFAULT_LAT: float = 28.6139  # New Delhi
    DEFAULT_LON: float = 77.2090
    DEFAULT_CITY: str = "New Delhi"
    DEFAULT_LANG: str = "en"
    DEFAULT_PROFESSION: str = "general"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
