from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Radius"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://radius:radius_secret@localhost:5432/radius_db"
    )

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Security
    SECRET_KEY: str = "change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # Geo
    DEFAULT_SEARCH_RADIUS_METERS: int = 1000
    MAX_SEARCH_RADIUS_METERS: int = 5000
    LOCATION_STALE_MINUTES: int = 5
    LOCATION_UPDATE_INTERVAL_SECONDS: int = 15

    # Presence TTL in Redis (seconds)
    PRESENCE_TTL: int = 300  # 5 minutes

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
