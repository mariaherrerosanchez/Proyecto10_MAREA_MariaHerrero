"""FastAPI application entry point for MAREA."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the API application without coupling it to future product services."""

    runtime_settings = settings or get_settings()
    application = FastAPI(title=runtime_settings.app_name)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=runtime_settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        """Provide a lightweight local readiness signal."""

        return {"status": "ok", "service": "marea-api", "environment": runtime_settings.environment}

    return application


app = create_app()
