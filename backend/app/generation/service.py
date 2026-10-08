"""Application service for the minimal technical generation flow."""

from dataclasses import dataclass

from app.guardrails.personal_facts import GuardrailAssessment, PersonalFactGuardrail
from app.llm.provider import LLMProvider, ProviderInvocationError
from app.llm.types import LLMResponse
from app.prompts.builder import PromptBuilder
from app.prompts.models import (
    GenerationContext,
    MultichannelGenerationRequest,
    Platform,
    PromptTrace,
)


@dataclass(frozen=True, slots=True)
class StructuredGenerationResult:
    """Generated text and the transient prompt trace that produced it."""

    response: LLMResponse
    trace: PromptTrace
    guardrails: GuardrailAssessment


@dataclass(frozen=True, slots=True)
class SuccessfulPlatformGeneration:
    """A completed independent generation for one requested platform."""

    platform: Platform
    generation: StructuredGenerationResult


@dataclass(frozen=True, slots=True)
class FailedPlatformGeneration:
    """A safe-to-classify provider failure that does not stop other platforms."""

    platform: Platform
    error: ProviderInvocationError


MultichannelGenerationResult = SuccessfulPlatformGeneration | FailedPlatformGeneration


class GenerationService:
    """Use the provider contract without coupling application logic to an SDK."""

    def __init__(
        self,
        provider: LLMProvider,
        prompt_builder: PromptBuilder,
        guardrail: PersonalFactGuardrail | None = None,
    ) -> None:
        self._provider = provider
        self._prompt_builder = prompt_builder
        self._guardrail = guardrail or PersonalFactGuardrail()

    def generate(self, context: GenerationContext) -> StructuredGenerationResult:
        """Build structured messages and send them through the provider contract."""

        prompt = self._prompt_builder.build(context)
        response = self._provider.generate(prompt.request)
        return StructuredGenerationResult(
            response=response,
            trace=prompt.trace,
            guardrails=self._guardrail.assess(response.text, context),
        )

    def generate_many(
        self,
        request: MultichannelGenerationRequest,
    ) -> tuple[MultichannelGenerationResult, ...]:
        """Generate once per selected platform, retaining controlled provider failures."""

        results: list[MultichannelGenerationResult] = []
        for platform in request.platforms:
            try:
                generation = self.generate(request.context_for(platform))
            except ProviderInvocationError as error:
                results.append(FailedPlatformGeneration(platform=platform, error=error))
            else:
                results.append(
                    SuccessfulPlatformGeneration(
                        platform=platform,
                        generation=generation,
                    )
                )
        return tuple(results)
