"""Tests for the provider-agnostic technical generation service."""

from app.generation.service import GenerationService
from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata


class RecordingProvider:
    """Fake provider proving the service only needs the common contract."""

    metadata = ProviderMetadata(provider="fake", model="fake-model")

    def __init__(self) -> None:
        self.requests: list[LLMRequest] = []

    def generate(self, request: LLMRequest) -> LLMResponse:
        self.requests.append(request)
        return LLMResponse(text="Generated text", metadata=self.metadata)


def test_generation_service_depends_only_on_the_provider_contract() -> None:
    provider = RecordingProvider()
    service = GenerationService(provider)

    response = service.generate("Raw prompt")

    assert provider.requests == [LLMRequest(prompt="Raw prompt")]
    assert response == LLMResponse(
        text="Generated text",
        metadata=ProviderMetadata(provider="fake", model="fake-model"),
    )
