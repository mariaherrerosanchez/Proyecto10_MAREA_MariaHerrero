"""Application service for the minimal technical generation flow."""

from app.llm.provider import LLMProvider
from app.llm.types import LLMRequest, LLMResponse


class GenerationService:
    """Use the provider contract without coupling application logic to an SDK."""

    def __init__(self, provider: LLMProvider) -> None:
        self._provider = provider

    def generate(self, prompt: str) -> LLMResponse:
        """Generate text for a prompt prepared by the HTTP caller."""

        return self._provider.generate(LLMRequest(prompt=prompt))
