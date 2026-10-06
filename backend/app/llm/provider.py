"""Contracts and controlled errors for LLM providers."""

from typing import Protocol, runtime_checkable

from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata


@runtime_checkable
class LLMProvider(Protocol):
    """Common provider contract independent of a vendor SDK."""

    @property
    def metadata(self) -> ProviderMetadata:
        """Return the provider and model used by this implementation."""

        ...

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate a textual response for an already-built prompt."""

        ...


class ProviderInvocationError(RuntimeError):
    """A safe, provider-specific failure without request content or secrets."""

    def __init__(self, metadata: ProviderMetadata) -> None:
        self.metadata = metadata
        super().__init__(
            "LLM provider invocation failed "
            f"(provider={metadata.provider}, model={metadata.model})."
        )
