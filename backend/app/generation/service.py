"""Application service for the minimal technical generation flow."""

from dataclasses import dataclass

from app.guardrails.personal_facts import GuardrailAssessment, PersonalFactGuardrail
from app.llm.provider import LLMProvider
from app.llm.types import LLMResponse
from app.prompts.builder import PromptBuilder
from app.prompts.models import GenerationContext, PromptTrace


@dataclass(frozen=True, slots=True)
class StructuredGenerationResult:
    """Generated text and the transient prompt trace that produced it."""

    response: LLMResponse
    trace: PromptTrace
    guardrails: GuardrailAssessment


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
