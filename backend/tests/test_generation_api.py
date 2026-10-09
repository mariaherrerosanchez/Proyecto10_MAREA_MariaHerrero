"""Tests for the technical generation HTTP boundary."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.api.dependencies import get_generation_service_factory
from app.core.config import Settings
from app.generation.service import GenerationService
from app.llm.factory import ResolvedProviderConfiguration, SupportedProvider
from app.llm.provider import LLMProvider, ProviderInvocationError
from app.llm.types import LLMRequest, LLMResponse, ModelSelection, ProviderMetadata
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


class PartiallyFailingProvider(SuccessfulProvider):
    def __init__(self) -> None:
        self.calls = 0

    def generate(self, request: LLMRequest) -> LLMResponse:
        self.calls += 1
        if self.calls == 2:
            raise ProviderInvocationError(self.metadata) from RuntimeError("provider-secret")
        return super().generate(request)


class FixedGenerationServiceFactory:
    """Test-only factory that avoids provider construction and external calls."""

    def __init__(
        self,
        provider: LLMProvider,
        configurations: tuple[ResolvedProviderConfiguration, ...] = (),
    ) -> None:
        self._provider = provider
        self._configurations = configurations
        self.selections: list[ModelSelection] = []

    def create(self, selection: ModelSelection) -> GenerationService:
        self.selections.append(selection)
        return GenerationService(self._provider, PromptBuilder())

    def available_models(self) -> tuple[ResolvedProviderConfiguration, ...]:
        return self._configurations


def override_generation_factory(
    application: FastAPI,
    provider: LLMProvider,
    configurations: tuple[ResolvedProviderConfiguration, ...] = (),
) -> FixedGenerationServiceFactory:
    factory = FixedGenerationServiceFactory(provider, configurations)
    application.dependency_overrides[get_generation_service_factory] = lambda: factory
    return factory


def configured_model(selection: ModelSelection, model: str) -> ResolvedProviderConfiguration:
    return ResolvedProviderConfiguration(
        provider=SupportedProvider.GROQ,
        selection=selection,
        metadata=ProviderMetadata(
            provider="groq",
            model=model,
            processing_location="external",
        ),
    )


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


def valid_multichannel_request_body() -> dict[str, object]:
    request = valid_request_body()
    request.pop("platform")
    return request | {"platforms": ["linkedin", "instagram", "facebook"]}


def test_generation_endpoint_returns_text_and_provider_metadata() -> None:
    application = create_app(Settings(_env_file=None))
    factory = override_generation_factory(application, SuccessfulProvider())
    client = TestClient(application)

    response = client.post("/generation", json=valid_request_body())

    assert response.status_code == 200
    assert response.json() == {
        "text": "Texto generado",
        "provider": "groq",
        "model": "configured-model",
        "processing_location": "external",
        "trace": {
            "prompt_version": "v7",
            "context": valid_request_body()
            | {
                "subniche": None,
                "additional_context": None,
            "profile_context": None,
            "model_selection": "primary",
            },
        },
        "guardrails": {
            "findings": [],
            "review_required": False,
        },
    }
    assert factory.selections == ["primary"]


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


def test_multichannel_endpoint_preserves_safe_configuration_errors() -> None:
    application = create_app(Settings(_env_file=None))
    client = TestClient(application, raise_server_exceptions=False)

    response = client.post("/generation/multichannel", json=valid_multichannel_request_body())

    assert response.status_code == 503
    assert response.json() == {
        "code": "provider_not_configured",
        "detail": "La generación aún no está configurada. Revisa el proveedor y el modelo.",
    }


def test_multichannel_endpoint_preserves_safe_unavailable_provider_errors() -> None:
    application = create_app(
        Settings(_env_file=None, LLM_PROVIDER="ollama", OLLAMA_MODEL="local-model")
    )
    client = TestClient(application, raise_server_exceptions=False)

    response = client.post("/generation/multichannel", json=valid_multichannel_request_body())

    assert response.status_code == 503
    assert response.json()["code"] == "provider_not_available"


def test_model_catalog_preserves_safe_configuration_errors() -> None:
    application = create_app(Settings(_env_file=None))
    client = TestClient(application, raise_server_exceptions=False)

    response = client.get("/generation/models")

    assert response.status_code == 503
    assert response.json()["code"] == "provider_not_configured"


def test_generation_endpoint_hides_provider_failure_details() -> None:
    application = create_app(Settings(_env_file=None))
    override_generation_factory(application, FailingProvider())
    client = TestClient(application, raise_server_exceptions=False)

    response = client.post("/generation", json=valid_request_body())

    assert response.status_code == 502
    assert response.json() == {
        "code": "provider_request_failed",
        "detail": "No se ha podido generar el texto en este momento. Inténtalo de nuevo.",
    }
    assert "Explicar qué es MAREA" not in response.text
    assert "secret-that-must-not-reach-the-client" not in response.text


def test_generation_endpoint_uses_selected_model_slot_and_traces_it() -> None:
    application = create_app(Settings(_env_file=None))
    factory = override_generation_factory(application, SuccessfulProvider())
    client = TestClient(application)

    response = client.post(
        "/generation",
        json=valid_request_body() | {"model_selection": "secondary"},
    )

    assert response.status_code == 200
    assert factory.selections == ["secondary"]
    assert response.json()["trace"]["context"]["model_selection"] == "secondary"


def test_generation_endpoint_defaults_absent_niches_to_an_empty_list() -> None:
    application = create_app(Settings(_env_file=None))
    override_generation_factory(application, SuccessfulProvider())
    client = TestClient(application)
    request_body = valid_request_body()
    request_body.pop("niches")

    response = client.post("/generation", json=request_body)

    assert response.status_code == 200
    assert response.json()["trace"]["context"]["niches"] == []


def test_generation_endpoint_rejects_the_replaced_singular_niche_field() -> None:
    application = create_app(Settings(_env_file=None))
    override_generation_factory(application, SuccessfulProvider())
    client = TestClient(application)
    request_body = valid_request_body() | {"niche": "Tecnología"}

    response = client.post("/generation", json=request_body)

    assert response.status_code == 422


def test_multichannel_endpoint_returns_one_independent_result_per_platform() -> None:
    provider = SuccessfulProvider()
    application = create_app(Settings(_env_file=None))
    factory = override_generation_factory(application, provider)
    client = TestClient(application)

    response = client.post("/generation/multichannel", json=valid_multichannel_request_body())

    assert response.status_code == 200
    results = response.json()["results"]
    assert [result["platform"] for result in results] == ["linkedin", "instagram", "facebook"]
    assert [result["status"] for result in results] == ["success", "success", "success"]
    assert [result["generation"]["trace"]["context"]["platform"] for result in results] == [
        "linkedin",
        "instagram",
        "facebook",
    ]
    assert factory.selections == ["primary"]


def test_multichannel_endpoint_uses_one_selected_model_for_every_platform() -> None:
    application = create_app(Settings(_env_file=None))
    factory = override_generation_factory(application, SuccessfulProvider())
    client = TestClient(application)

    response = client.post(
        "/generation/multichannel",
        json=valid_multichannel_request_body() | {"model_selection": "tertiary"},
    )

    assert response.status_code == 200
    assert factory.selections == ["tertiary"]
    assert {
        result["generation"]["trace"]["context"]["model_selection"]
        for result in response.json()["results"]
    } == {"tertiary"}


def test_model_catalog_returns_only_public_configured_model_metadata() -> None:
    application = create_app(Settings(_env_file=None))
    configurations = (
        configured_model("primary", "openai/gpt-oss-120b"),
        configured_model("secondary", "example/second-model"),
        configured_model("tertiary", "example/third-model"),
    )
    override_generation_factory(application, SuccessfulProvider(), configurations)
    client = TestClient(application)

    response = client.get("/generation/models")

    assert response.status_code == 200
    assert response.json() == [
        {
            "selection": "primary",
            "provider": "groq",
            "model": "openai/gpt-oss-120b",
            "processing_location": "external",
        },
        {
            "selection": "secondary",
            "provider": "groq",
            "model": "example/second-model",
            "processing_location": "external",
        },
        {
            "selection": "tertiary",
            "provider": "groq",
            "model": "example/third-model",
            "processing_location": "external",
        },
    ]
    assert "api_key" not in response.text
    assert "test-private-key" not in response.text


def test_multichannel_endpoint_continues_after_a_provider_failure_without_leaking_details() -> None:
    provider = PartiallyFailingProvider()
    application = create_app(Settings(_env_file=None))
    override_generation_factory(application, provider)
    client = TestClient(application)

    response = client.post("/generation/multichannel", json=valid_multichannel_request_body())

    assert response.status_code == 200
    results = response.json()["results"]
    assert [result["status"] for result in results] == ["success", "error", "success"]
    assert results[1]["error"] == {
        "code": "provider_request_failed",
        "detail": "No se ha podido generar el texto en este momento. Inténtalo de nuevo.",
    }
    assert "provider-secret" not in response.text


def test_multichannel_endpoint_returns_structured_failures_when_every_provider_call_fails() -> None:
    application = create_app(Settings(_env_file=None))
    override_generation_factory(application, FailingProvider())
    client = TestClient(application)

    response = client.post("/generation/multichannel", json=valid_multichannel_request_body())

    assert response.status_code == 200
    assert [result["status"] for result in response.json()["results"]] == [
        "error",
        "error",
        "error",
    ]
    assert "secret-that-must-not-reach-the-client" not in response.text


@pytest.mark.parametrize(
    "platforms",
    [[], ["linkedin", "linkedin"], ["linkedin", "unknown"]],
)
def test_multichannel_endpoint_rejects_empty_duplicate_or_invalid_platforms(
    platforms: list[str],
) -> None:
    application = create_app(Settings(_env_file=None))
    override_generation_factory(application, SuccessfulProvider())
    client = TestClient(application)

    response = client.post(
        "/generation/multichannel",
        json=valid_multichannel_request_body() | {"platforms": platforms},
    )

    assert response.status_code == 422
