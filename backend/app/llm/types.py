"""Provider-agnostic data contracts for LLM invocation."""

from dataclasses import dataclass
from typing import Literal

from langchain_core.messages import BaseMessage


ProcessingLocation = Literal["local", "external"]


@dataclass(frozen=True, slots=True)
class LLMRequest:
    """Provider-agnostic request using LangChain's shared message contract."""

    messages: tuple[BaseMessage, ...]


@dataclass(frozen=True, slots=True)
class ProviderMetadata:
    """Identify the provider and model effectively used for an invocation."""

    provider: str
    model: str
    processing_location: ProcessingLocation


@dataclass(frozen=True, slots=True)
class LLMResponse:
    """Normalized textual response returned by an LLM provider."""

    text: str
    metadata: ProviderMetadata
