"""Resolve LLM configuration without constructing provider SDK clients."""

from dataclasses import dataclass
from enum import StrEnum

from app.core.config import Settings
from app.llm.provider import LLMProvider
from app.llm.types import ProviderMetadata


class SupportedProvider(StrEnum):
    """Provider names supported by MAREA's LLM abstraction."""

    GROQ = "groq"
    OPENROUTER = "openrouter"
    OLLAMA = "ollama"


class ProviderConfigurationError(ValueError):
    """Raised when the selected provider cannot be resolved safely."""


class UnsupportedProviderError(ProviderConfigurationError):
    """Raised when configuration names a provider outside MAREA's contract."""


class ProviderNotImplementedError(ProviderConfigurationError):
    """Raised for recognized providers whose client is not integrated yet."""


class MissingProviderCredentialsError(ProviderConfigurationError):
    """Raised when a selected provider lacks required private configuration."""


@dataclass(frozen=True, slots=True)
class ResolvedProviderConfiguration:
    """The provider/model pair selected by private backend configuration."""

    provider: SupportedProvider
    metadata: ProviderMetadata


def resolve_provider_configuration(settings: Settings) -> ResolvedProviderConfiguration:
    """Resolve a supported provider and its configured model without creating a client."""

    provider = _resolve_provider_name(settings.llm_provider)
    model = settings.model_for_provider(provider.value)
    if not model or not model.strip():
        raise ProviderConfigurationError(
            f"No model is configured for provider '{provider.value}'."
        )

    return ResolvedProviderConfiguration(
        provider=provider,
        metadata=ProviderMetadata(provider=provider.value, model=model),
    )


def create_llm_provider(settings: Settings) -> LLMProvider:
    """Build only the provider clients available in the current application version."""

    configuration = resolve_provider_configuration(settings)
    if configuration.provider is SupportedProvider.GROQ:
        from app.llm.groq_provider import create_groq_provider

        return create_groq_provider(settings, configuration)

    raise ProviderNotImplementedError(
        f"The '{configuration.provider.value}' provider is not integrated yet."
    )


def _resolve_provider_name(value: str | None) -> SupportedProvider:
    """Validate the optional environment value when a provider is required."""

    if not value or not value.strip():
        raise ProviderConfigurationError("No LLM provider is configured.")

    try:
        return SupportedProvider(value.strip().lower())
    except ValueError as error:
        raise UnsupportedProviderError(
            f"Unsupported LLM provider '{value}'."
        ) from error
