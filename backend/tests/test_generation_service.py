"""Tests for the provider-agnostic technical generation service."""

from app.generation.service import GenerationService
from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata
from app.prompts.builder import PromptBuilder
from app.prompts.models import GenerationContext


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
    service = GenerationService(provider, PromptBuilder())

    result = service.generate(
        GenerationContext(
            topic="Raw prompt",
            niches=["Tecnología"],
            objective="Explicar",
            audience="Personas interesadas",
            tone="Cercano",
            language="es",
            platform="blog",
        )
    )

    assert len(provider.requests) == 1
    assert len(provider.requests[0].messages) == 2
    assert result.response == LLMResponse(
        text="Generated text",
        metadata=ProviderMetadata(provider="fake", model="fake-model"),
    )
    assert result.trace.prompt_version == "v3"
    assert result.guardrails.review_required is False


def test_generation_service_flags_unsupported_personal_claims() -> None:
    class UnsupportedClaimProvider(RecordingProvider):
        def generate(self, request: LLMRequest) -> LLMResponse:
            self.requests.append(request)
            return LLMResponse(
                text="He trabajado durante 10 años en automatización.",
                metadata=self.metadata,
            )

    service = GenerationService(UnsupportedClaimProvider(), PromptBuilder())

    result = service.generate(
        GenerationContext(
            topic="Automatización",
            objective="Divulgación",
            audience="Personas no técnicas",
            tone="Cercano",
            language="es",
            platform="linkedin",
        )
    )

    assert result.guardrails.review_required is True
    assert result.guardrails.findings[0].category == "experience"
