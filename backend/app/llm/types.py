"""Provider-agnostic data contracts for LLM invocation."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LLMRequest:
    """A technical request containing a prompt already prepared upstream."""

    prompt: str


@dataclass(frozen=True, slots=True)
class ProviderMetadata:
    """Identify the provider and model effectively used for an invocation."""

    provider: str
    model: str


@dataclass(frozen=True, slots=True)
class LLMResponse:
    """Normalized textual response returned by an LLM provider."""

    text: str
    metadata: ProviderMetadata
