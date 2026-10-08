"""Tests for the initial FastAPI foundation."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_health_check_returns_service_status() -> None:
    client = TestClient(create_app(Settings(_env_file=None)))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "marea-api",
        "environment": "development",
    }


def test_settings_read_backend_environment_variables(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("BACKEND_HOST", "0.0.0.0")
    monkeypatch.setenv("BACKEND_PORT", "9000")
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "http://localhost:5173, https://marea.example")

    settings = Settings(_env_file=None)

    assert settings.environment == "test"
    assert settings.host == "0.0.0.0"
    assert settings.port == 9000
    assert settings.allowed_origins == ["http://localhost:5173", "https://marea.example"]


def test_cors_uses_configured_origin() -> None:
    application = create_app(Settings(BACKEND_CORS_ORIGINS="https://marea.example"))
    client = TestClient(application)

    response = client.options(
        "/health",
        headers={
            "Origin": "https://marea.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://marea.example"
