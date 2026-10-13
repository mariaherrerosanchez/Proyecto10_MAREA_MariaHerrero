"""Tests for transient translations without provider network calls."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_core.messages import HumanMessage, SystemMessage

from app.api.dependencies import get_generation_service_factory
from app.core.config import Settings
from app.llm.provider import LLMProvider, ProviderInvocationError
from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata
from app.main import create_app
from app.translation.models import TranslationRequest
from app.translation.prompt_builder import TranslationPromptBuilder
from app.translation.service import TranslationService


class RecordingProvider:
    metadata = ProviderMetadata(provider="groq", model="configured-model", processing_location="external")

    def __init__(self, text: str = "Translated text") -> None:
        self.text = text
        self.requests: list[LLMRequest] = []

    def generate(self, request: LLMRequest) -> LLMResponse:
        self.requests.append(request)
        return LLMResponse(text=self.text, metadata=self.metadata)


class FailingProvider(RecordingProvider):
    def generate(self, request: LLMRequest) -> LLMResponse:
        self.requests.append(request)
        raise ProviderInvocationError(self.metadata) from RuntimeError("private provider failure")


class TranslationFactory:
    def __init__(self, provider: LLMProvider) -> None:
        self.provider = provider
        self.selections: list[str] = []

    def create_provider(self, selection: str) -> LLMProvider:
        self.selections.append(selection)
        return self.provider


def request_body() -> dict[str, str]:
    return {
        "text": "Hola 👋\n\n#MAREA",
        "target_language": "en",
        "model_selection": "secondary",
    }


def test_translation_prompt_isolated_from_generation_and_preserves_source_text() -> None:
    request = TranslationRequest(**request_body())
    messages = TranslationPromptBuilder().build(request).messages

    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    assert "Traduce únicamente" in str(messages[0].content)
    assert "Idioma de destino: en" in str(messages[1].content)
    assert "Hola 👋" in str(messages[1].content)
    assert "Tema:" not in str(messages[1].content)


def test_translation_service_uses_common_provider_contract() -> None:
    provider = RecordingProvider("Hello 👋\n\n#MAREA")
    response = TranslationService(provider, TranslationPromptBuilder()).translate(
        TranslationRequest(**request_body())
    )

    assert response.text == "Hello 👋\n\n#MAREA"
    assert len(provider.requests) == 1


def test_translation_endpoint_returns_safe_metadata_and_selected_model() -> None:
    application = create_app(Settings(_env_file=None))
    factory = TranslationFactory(RecordingProvider("Hello 👋\n\n#MAREA"))
    application.dependency_overrides[get_generation_service_factory] = lambda: factory
    client = TestClient(application)

    response = client.post("/translation", json=request_body())

    assert response.status_code == 200
    assert response.json() == {
        "text": "Hello 👋\n\n#MAREA",
        "target_language": "en",
        "provider": "groq",
        "model": "configured-model",
        "processing_location": "external",
    }
    assert factory.selections == ["secondary"]
    assert "api_key" not in response.text


def test_translation_endpoint_validates_text_and_supported_target_languages() -> None:
    client = TestClient(create_app(Settings(_env_file=None)))

    assert client.post("/translation", json={"text": "", "target_language": "en"}).status_code == 422
    assert client.post("/translation", json={"text": "Hola", "target_language": "pt"}).status_code == 422


def test_translation_endpoint_hides_provider_failures() -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_generation_service_factory] = lambda: TranslationFactory(FailingProvider())
    client = TestClient(application, raise_server_exceptions=False)

    response = client.post("/translation", json=request_body())

    assert response.status_code == 502
    assert response.json()["code"] == "translation_request_failed"
    assert "private" not in response.text
