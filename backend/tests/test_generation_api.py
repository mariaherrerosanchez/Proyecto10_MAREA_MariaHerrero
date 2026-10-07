"""Tests for the technical generation HTTP boundary."""

from fastapi.testclient import TestClient

from app.api.dependencies import get_generation_service
from app.core.config import Settings
from app.generation.service import GenerationService
from app.llm.provider import ProviderInvocationError
from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata
from app.main import create_app
from app.prompts.builder import PromptBuilder


class SuccessfulProvider:
    """Fake provider returning a deterministic generated result."""

    metadata = ProviderMetadata(
        provider="groq", model="configured-model", processing_location="external"
    )

    def generate(self, _request: LLMRequest) -> LLMResponse:
        return LLMResponse(text="Texto generado", metadata=self.metadata)


class FailingProvider:
    """Fake provider that simulates a sensitive upstream failure."""

    metadata = ProviderMetadata(
        provider="groq", model="configured-model", processing_location="external"
    )

    def generate(self, _request: LLMRequest) -> LLMResponse:
        original_error = RuntimeError("secret-that-must-not-reach-the-client")
        raise ProviderInvocationError(self.metadata) from original_error


def valid_request_body() -> dict[str, object]:
    return {
        "topic": "Explicar qué es MAREA",
        "niches": ["Inteligencia Artificial", "QA / Testing"],
        "objective": "Divulgación",
        "audience": "Profesionales no técnicos",
        "tone": "Cercano y profesional",
        "language": "es",
        "platform": "linkedin",
    }


def test_generation_endpoint_returns_text_and_provider_metadata() -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_generation_service] = lambda: GenerationService(
        SuccessfulProvider(), PromptBuilder()
    )
    client = TestClient(application)

    response = client.post("/generation", json=valid_request_body())

    assert response.status_code == 200
    assert response.json() == {
        "text": "Texto generado",
        "provider": "groq",
        "model": "configured-model",
        "processing_location": "external",
        "trace": {
            "prompt_version": "v3",
            "context": valid_request_body()
            | {
                "subniche": None,
                "additional_context": None,
                "profile_context": None,
            },
        },
        "guardrails": {
            "findings": [],
            "review_required": False,
        },
    }


def test_generation_endpoint_explains_missing_configuration_safely() -> None:
    application = create_app(Settings(_env_file=None))
    client = TestClient(application, raise_server_exceptions=False)

    response = client.post("/generation", json=valid_request_body())

    assert response.status_code == 503
    assert response.json() == {
        "code": "provider_not_configured",
        "detail": "La generación aún no está configurada. Revisa el proveedor y el modelo.",
    }


def test_generation_endpoint_explains_recognized_unavailable_provider() -> None:
    application = create_app(
        Settings(
            _env_file=None,
            LLM_PROVIDER="ollama",
            OLLAMA_MODEL="local-model",
        )
    )
    client = TestClient(application, raise_server_exceptions=False)

    response = client.post("/generation", json=valid_request_body())

    assert response.status_code == 503
    assert response.json() == {
        "code": "provider_not_available",
        "detail": "El proveedor seleccionado todavía no está disponible.",
    }


def test_generation_endpoint_hides_provider_failure_details() -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_generation_service] = lambda: GenerationService(
        FailingProvider(), PromptBuilder()
    )
    client = TestClient(application, raise_server_exceptions=False)

    response = client.post("/generation", json=valid_request_body())

    assert response.status_code == 502
    assert response.json() == {
        "code": "provider_request_failed",
        "detail": "No se ha podido generar el texto en este momento. Inténtalo de nuevo.",
    }
    assert "Explicar qué es MAREA" not in response.text
    assert "secret-that-must-not-reach-the-client" not in response.text


def test_generation_endpoint_defaults_absent_niches_to_an_empty_list() -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_generation_service] = lambda: GenerationService(
        SuccessfulProvider(), PromptBuilder()
    )
    client = TestClient(application)
    request_body = valid_request_body()
    request_body.pop("niches")

    response = client.post("/generation", json=request_body)

    assert response.status_code == 200
    assert response.json()["trace"]["context"]["niches"] == []


def test_generation_endpoint_rejects_the_replaced_singular_niche_field() -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_generation_service] = lambda: GenerationService(
        SuccessfulProvider(), PromptBuilder()
    )
    client = TestClient(application)
    request_body = valid_request_body() | {"niche": "Tecnología"}

    response = client.post("/generation", json=request_body)

    assert response.status_code == 422
