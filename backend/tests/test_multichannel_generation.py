"""Tests for sequential multichannel orchestration without external providers."""

from app.generation.service import (
    FailedPlatformGeneration,
    GenerationService,
    SuccessfulPlatformGeneration,
)
from app.llm.provider import ProviderInvocationError
from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata
from app.prompts.builder import PromptBuilder
from app.prompts.models import MultichannelGenerationRequest


class RecordingProvider:
    metadata = ProviderMetadata(
        provider="fake", model="fake-model", processing_location="external"
    )

    def __init__(self, failing_call: int | None = None, text: str = "Texto generado") -> None:
        self.requests: list[LLMRequest] = []
        self._failing_call = failing_call
        self._text = text

    def generate(self, request: LLMRequest) -> LLMResponse:
        self.requests.append(request)
        if len(self.requests) == self._failing_call:
            raise ProviderInvocationError(self.metadata) from RuntimeError("provider-secret")
        return LLMResponse(text=self._text, metadata=self.metadata)


def multichannel_request(platforms: list[str]) -> MultichannelGenerationRequest:
    return MultichannelGenerationRequest(
        topic="Explicar MAREA",
        objective="Divulgación",
        audience="Personas no técnicas",
        tone="Cercano",
        language="es",
        niches=["Tecnología"],
        platforms=platforms,
    )


def test_generate_many_preserves_platform_order_and_invokes_once_per_platform() -> None:
    provider = RecordingProvider()
    service = GenerationService(provider, PromptBuilder())

    results = service.generate_many(
        multichannel_request(["linkedin", "instagram", "facebook", "blog"])
    )

    assert [result.platform for result in results] == [
        "linkedin",
        "instagram",
        "facebook",
        "blog",
    ]
    assert len(provider.requests) == 4
    assert all(isinstance(result, SuccessfulPlatformGeneration) for result in results)
    assert [
        result.generation.trace.context.platform
        for result in results
        if isinstance(result, SuccessfulPlatformGeneration)
    ] == ["linkedin", "instagram", "facebook", "blog"]
    assert "Instrucciones editoriales para LinkedIn" in str(provider.requests[0].messages[2].content)
    assert "Instrucciones editoriales para Instagram" in str(provider.requests[1].messages[2].content)
    assert "Instrucciones editoriales para Facebook" in str(provider.requests[2].messages[2].content)
    assert "Instrucciones editoriales para Blog" in str(provider.requests[3].messages[2].content)


def test_generate_many_keeps_successes_around_an_intermediate_provider_failure() -> None:
    provider = RecordingProvider(failing_call=2)
    service = GenerationService(provider, PromptBuilder())

    results = service.generate_many(multichannel_request(["linkedin", "instagram", "facebook"]))

    assert len(provider.requests) == 3
    assert isinstance(results[0], SuccessfulPlatformGeneration)
    assert isinstance(results[1], FailedPlatformGeneration)
    assert isinstance(results[2], SuccessfulPlatformGeneration)
    assert [result.platform for result in results] == ["linkedin", "instagram", "facebook"]


def test_generate_many_assesses_guardrails_for_each_successful_platform() -> None:
    provider = RecordingProvider(text="He trabajado durante 10 años en automatización.")
    service = GenerationService(provider, PromptBuilder())

    results = service.generate_many(multichannel_request(["linkedin", "blog"]))

    successful = [result for result in results if isinstance(result, SuccessfulPlatformGeneration)]
    assert [result.generation.guardrails.review_required for result in successful] == [True, True]
    assert all(result.generation.trace.prompt_version == "v7" for result in successful)
