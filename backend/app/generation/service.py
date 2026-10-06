"""Application service for the minimal technical generation flow."""

from dataclasses import dataclass

from app.llm.provider import LLMProvider
from app.llm.types import LLMResponse
from app.prompts.builder import PromptBuilder
from app.prompts.models import GenerationContext, PromptTrace


@dataclass(frozen=True, slots=True)
class StructuredGenerationResult:
    """Generated text and the transient prompt trace that produced it."""

    response: LLMResponse
    trace: PromptTrace


class GenerationService:
    """Use the provider contract without coupling application logic to an SDK."""

    def __init__(self, provider: LLMProvider, prompt_builder: PromptBuilder) -> None:
        self._provider = provider
        self._prompt_builder = prompt_builder

    def generate(self, context: GenerationContext) -> StructuredGenerationResult:
        """Build structured messages and send them through the provider contract."""

        prompt = self._prompt_builder.build(context)
        return StructuredGenerationResult(
            response=self._provider.generate(prompt.request),
            trace=prompt.trace,
        )
