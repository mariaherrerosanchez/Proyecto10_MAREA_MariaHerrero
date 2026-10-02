"""Runtime configuration for the MAREA API."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings read from environment variables with safe local defaults."""

    model_config = SettingsConfigDict(extra="ignore")

    app_name: str = Field(default="MAREA API", validation_alias="APP_NAME")
    environment: str = Field(default="development", validation_alias="APP_ENV")
    log_level: str = Field(default="INFO", validation_alias="APP_LOG_LEVEL")
    host: str = Field(default="127.0.0.1", validation_alias="BACKEND_HOST")
    port: int = Field(default=8000, validation_alias="BACKEND_PORT")
    cors_origins: str = Field(
        default="http://localhost:5173",
        validation_alias="BACKEND_CORS_ORIGINS",
    )

    @property
    def allowed_origins(self) -> list[str]:
        """Return comma-separated CORS origins as a normalized list."""

        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Create and cache application settings for the process lifetime."""

    return Settings()
