"""Groq-specific construction for the shared MAREA LLM provider contract."""

from langchain_groq import ChatGroq

from app.core.config import Settings
from app.llm.factory import (
    MissingProviderCredentialsError,
    ResolvedProviderConfiguration,
    SupportedProvider,
)
from app.llm.langchain_provider import LangChainLLMProvider
from app.llm.provider import LLMProvider


def create_groq_provider(
    settings: Settings,
    configuration: ResolvedProviderConfiguration,
) -> LLMProvider:
    """Create the Groq-backed provider after validating its private API key."""

    if configuration.provider is not SupportedProvider.GROQ:
        raise ValueError("Groq construction requires Groq provider configuration.")

    api_key = settings.groq_api_key
    if not api_key or not api_key.strip():
        raise MissingProviderCredentialsError("Groq API credentials are not configured.")

    chat_model = ChatGroq(model=configuration.metadata.model, api_key=api_key)
    return LangChainLLMProvider(model=chat_model, metadata=configuration.metadata)
