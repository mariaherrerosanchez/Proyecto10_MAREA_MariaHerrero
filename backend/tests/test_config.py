"""Tests for environment-based backend configuration."""

from pathlib import Path

from app.core.config import Settings


OPTIONAL_CONFIGURATION_ENV_VARS = (
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "OLLAMA_MODEL",
    "LANGSMITH_API_KEY",
)


def test_settings_read_environment_configuration(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("APP_NAME", "MAREA Test")
    monkeypatch.setenv("APP_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("BACKEND_HOST", "0.0.0.0")
    monkeypatch.setenv("BACKEND_PORT", "9000")
    monkeypatch.setenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:5173,https://marea.example",
    )
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    monkeypatch.setenv("GROQ_API_KEY", "groq-test-key")
    monkeypatch.setenv("GROQ_MODEL", "llama-test")
    monkeypatch.setenv("OPENROUTER_API_KEY", "openrouter-test-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "openrouter-test-model")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama.test:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3.2")
    monkeypatch.setenv("LANGSMITH_TRACING", "true")
    monkeypatch.setenv("LANGSMITH_API_KEY", "langsmith-test-key")
    monkeypatch.setenv("LANGSMITH_PROJECT", "marea-test")
    monkeypatch.setenv("LANGSMITH_ENDPOINT", "https://langsmith.test")

    settings = Settings(_env_file=None)

    assert settings.environment == "test"
    assert settings.app_name == "MAREA Test"
    assert settings.log_level == "DEBUG"
    assert settings.host == "0.0.0.0"
    assert settings.port == 9000
    assert settings.allowed_origins == ["http://localhost:5173", "https://marea.example"]
    assert settings.database_url == "sqlite:///./test.db"
    assert settings.groq_api_key == "groq-test-key"
    assert settings.groq_model == "llama-test"
    assert settings.openrouter_api_key == "openrouter-test-key"
    assert settings.openrouter_model == "openrouter-test-model"
    assert settings.ollama_base_url == "http://ollama.test:11434"
    assert settings.ollama_model == "llama3.2"
    assert settings.langsmith_tracing is True
    assert settings.langsmith_api_key == "langsmith-test-key"
    assert settings.langsmith_project == "marea-test"
    assert settings.langsmith_endpoint == "https://langsmith.test"


def test_settings_allow_missing_optional_credentials(monkeypatch) -> None:
    for variable_name in OPTIONAL_CONFIGURATION_ENV_VARS:
        monkeypatch.delenv(variable_name, raising=False)

    settings = Settings(_env_file=None)

    assert settings.database_url == "sqlite:///./marea.db"
    assert settings.groq_api_key is None
    assert settings.groq_model is None
    assert settings.openrouter_api_key is None
    assert settings.openrouter_model is None
    assert settings.ollama_base_url == "http://localhost:11434"
    assert settings.ollama_model is None
    assert settings.langsmith_tracing is False
    assert settings.langsmith_api_key is None
    assert settings.langsmith_project == "MAREA"
    assert settings.langsmith_endpoint == "https://api.smith.langchain.com"


def test_environment_values_override_dotenv_values(tmp_path: Path, monkeypatch) -> None:
    dotenv_file = tmp_path / ".env"
    dotenv_file.write_text(
        "APP_ENV=dotenv\n"
        "APP_NAME=MAREA from dotenv\n"
        "DATABASE_URL=sqlite:///./dotenv.db\n"
        "LANGSMITH_TRACING=true\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("APP_ENV", "environment")

    settings = Settings(_env_file=dotenv_file)

    assert settings.environment == "environment"
    assert settings.app_name == "MAREA from dotenv"
    assert settings.database_url == "sqlite:///./dotenv.db"
    assert settings.langsmith_tracing is True
