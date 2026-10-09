"""Runtime configuration for the MAREA API."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.llm.types import ModelSelection

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Settings read from environment variables with safe local defaults."""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="MAREA API", validation_alias="APP_NAME")
    environment: str = Field(default="development", validation_alias="APP_ENV")
    log_level: str = Field(default="INFO", validation_alias="APP_LOG_LEVEL")
    host: str = Field(default="127.0.0.1", validation_alias="BACKEND_HOST")
    port: int = Field(default=8000, validation_alias="BACKEND_PORT")
    cors_origins: str = Field(
        default="http://localhost:5173",
        validation_alias="BACKEND_CORS_ORIGINS",
    )
    database_url: str = Field(default="sqlite:///./marea.db", validation_alias="DATABASE_URL")
    radar_rss_sources: str = Field(
        default="elpais-tecnologia,elpais-ciencia",
        validation_alias="RADAR_RSS_SOURCES",
    )
    radar_request_timeout_seconds: float = Field(
        default=5.0,
        ge=0.1,
        le=30.0,
        validation_alias="RADAR_REQUEST_TIMEOUT_SECONDS",
    )
    radar_max_feed_bytes: int = Field(
        default=1_000_000,
        ge=1_024,
        le=5_000_000,
        validation_alias="RADAR_MAX_FEED_BYTES",
    )

    llm_provider: str | None = Field(default=None, validation_alias="LLM_PROVIDER")
    groq_api_key: str | None = Field(default=None, validation_alias="GROQ_API_KEY")
    groq_model: str | None = Field(default=None, validation_alias="GROQ_MODEL")
    groq_secondary_model: str | None = Field(
        default=None,
        validation_alias="GROQ_MODEL_SECONDARY",
    )
    groq_tertiary_model: str | None = Field(
        default=None,
        validation_alias="GROQ_MODEL_TERTIARY",
    )
    openrouter_api_key: str | None = Field(default=None, validation_alias="OPENROUTER_API_KEY")
    openrouter_model: str | None = Field(default=None, validation_alias="OPENROUTER_MODEL")
    ollama_base_url: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_BASE_URL")
    ollama_model: str | None = Field(default=None, validation_alias="OLLAMA_MODEL")

    langsmith_tracing: bool = Field(default=False, validation_alias="LANGSMITH_TRACING")
    langsmith_api_key: str | None = Field(default=None, validation_alias="LANGSMITH_API_KEY")
    langsmith_project: str = Field(default="MAREA", validation_alias="LANGSMITH_PROJECT")
    langsmith_endpoint: str = Field(
        default="https://api.smith.langchain.com",
        validation_alias="LANGSMITH_ENDPOINT",
    )

    @property
    def allowed_origins(self) -> list[str]:
        """Return comma-separated CORS origins as a normalized list."""

        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def radar_source_ids(self) -> tuple[str, ...]:
        """Return configured source identifiers, never arbitrary feed URLs."""

        return tuple(
            source_id.strip()
            for source_id in self.radar_rss_sources.split(",")
            if source_id.strip()
        )

    def model_for_provider(
        self,
        provider: str,
        selection: ModelSelection = "primary",
    ) -> str | None:
        """Return the configured model for a supported provider name."""

        if provider == "groq":
            return {
                "primary": self.groq_model,
                "secondary": self.groq_secondary_model,
                "tertiary": self.groq_tertiary_model,
            }[selection]

        return {
            "openrouter": self.openrouter_model,
            "ollama": self.ollama_model,
        }.get(provider)


@lru_cache
def get_settings() -> Settings:
    """Create and cache application settings for the process lifetime."""

    return Settings()
