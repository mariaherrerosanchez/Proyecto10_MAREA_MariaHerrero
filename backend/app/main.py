"""FastAPI application entry point for MAREA."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.generation import router as generation_router
from app.api.radar import router as radar_router
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
    register_exception_handlers(application)
    application.include_router(generation_router)
    application.include_router(radar_router)

    if settings is not None:
        application.dependency_overrides[get_settings] = lambda: runtime_settings

    @application.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        """Provide a lightweight local readiness signal."""

        return {"status": "ok", "service": "marea-api", "environment": runtime_settings.environment}

    return application


app = create_app()
