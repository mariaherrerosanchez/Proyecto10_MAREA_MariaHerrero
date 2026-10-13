"""Application service for one-off translations."""

from app.llm.provider import LLMProvider
from app.llm.types import LLMResponse
from app.translation.models import TranslationRequest
from app.translation.prompt_builder import TranslationPromptBuilder


class TranslationUnavailableError(RuntimeError):
    """Represent a provider failure while translating without retaining its details."""


class TranslationService:
    """Translate a supplied draft without invoking the generation prompt flow."""

    def __init__(self, provider: LLMProvider, prompt_builder: TranslationPromptBuilder) -> None:
        self._provider = provider
        self._prompt_builder = prompt_builder

    def translate(self, request: TranslationRequest) -> LLMResponse:
        """Send only the existing text and explicit target language to the provider."""

        return self._provider.generate(self._prompt_builder.build(request))
