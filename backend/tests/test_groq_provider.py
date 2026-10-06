"""Tests for Groq construction without calling the external provider."""

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.core.config import Settings
from app.llm.factory import (
    MissingProviderCredentialsError,
    ProviderNotImplementedError,
    create_llm_provider,
    resolve_provider_configuration,
)
from app.llm.groq_provider import create_groq_provider
from app.llm.types import LLMRequest, ProviderMetadata


class FakeChatGroq:
    """Deterministic substitute for ChatGroq in provider construction tests."""

    last_created_with: dict[str, str] | None = None

    def __init__(self, *, model: str, api_key: str) -> None:
        type(self).last_created_with = {"model": model, "api_key": api_key}

    def invoke(self, _messages: object) -> AIMessage:
        return AIMessage(content="Texto de prueba")


def test_groq_provider_uses_model_and_key_from_private_settings(monkeypatch) -> None:
    monkeypatch.setattr("app.llm.groq_provider.ChatGroq", FakeChatGroq)
    settings = Settings(
        _env_file=None,
        LLM_PROVIDER="groq",
        GROQ_MODEL="configured-model",
        GROQ_API_KEY="test-private-key",
    )

    provider = create_llm_provider(settings)
    response = provider.generate(LLMRequest(messages=(HumanMessage(content="Hola"),)))

    assert response.text == "Texto de prueba"
    assert response.metadata == ProviderMetadata(
        provider="groq",
        model="configured-model",
    )
    assert FakeChatGroq.last_created_with == {
        "model": "configured-model",
        "api_key": "test-private-key",
    }


def test_groq_provider_requires_a_private_api_key() -> None:
    settings = Settings(_env_file=None, LLM_PROVIDER="groq", GROQ_MODEL="configured-model")
    configuration = resolve_provider_configuration(settings)

    with pytest.raises(MissingProviderCredentialsError):
        create_groq_provider(settings, configuration)


def test_recognized_provider_without_client_is_not_constructed() -> None:
    settings = Settings(
        _env_file=None,
        LLM_PROVIDER="openrouter",
        OPENROUTER_MODEL="openrouter/free",
    )

    with pytest.raises(ProviderNotImplementedError):
        create_llm_provider(settings)
