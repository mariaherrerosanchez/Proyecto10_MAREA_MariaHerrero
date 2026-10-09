"""Unit tests for the provider-agnostic LLM infrastructure."""

import logging
from unittest.mock import Mock

import pytest
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage

from app.core.config import Settings
from app.llm.factory import (
    ProviderConfigurationError,
    UnsupportedProviderError,
    available_model_configurations,
    resolve_provider_configuration,
)
from app.llm.langchain_provider import LangChainLLMProvider
from app.llm.provider import LLMProvider, ProviderInvocationError
from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata


class FakeProvider:
    """Minimal implementation used to verify the common provider contract."""

    metadata = ProviderMetadata(
        provider="fake", model="fake-model", processing_location="external"
    )

    def generate(self, request: LLMRequest) -> LLMResponse:
        return LLMResponse(text=str(request.messages[0].content), metadata=self.metadata)


def test_common_provider_contract_is_runtime_checkable() -> None:
    provider = FakeProvider()

    assert isinstance(provider, LLMProvider)
    assert provider.generate(LLMRequest(messages=(HumanMessage(content="test"),))).text == "test"


def test_langchain_provider_invokes_injected_model_and_normalizes_response() -> None:
    model = Mock(spec=BaseChatModel)
    model.invoke.return_value = AIMessage(content=[{"text": "Hola "}, "MAREA"])
    metadata = ProviderMetadata(
        provider="groq", model="llama-test", processing_location="external"
    )
    provider = LangChainLLMProvider(model=model, metadata=metadata)

    response = provider.generate(LLMRequest(messages=(HumanMessage(content="Prompt de prueba"),)))

    model.invoke.assert_called_once()
    messages = model.invoke.call_args.args[0]
    assert messages == [HumanMessage(content="Prompt de prueba")]
    assert response == LLMResponse(text="Hola MAREA", metadata=metadata)
    assert response.metadata.provider == "groq"
    assert response.metadata.model == "llama-test"


def test_factory_resolves_selected_provider_and_its_model() -> None:
    settings = Settings(
        _env_file=None,
        LLM_PROVIDER="openrouter",
        OPENROUTER_MODEL="openrouter/test-model",
    )

    resolved = resolve_provider_configuration(settings)

    assert resolved.metadata == ProviderMetadata(
        provider="openrouter",
        model="openrouter/test-model",
        processing_location="external",
    )


def test_factory_resolves_each_configured_groq_selection() -> None:
    settings = Settings(
        _env_file=None,
        LLM_PROVIDER="groq",
        GROQ_MODEL="openai/gpt-oss-20b",
        GROQ_MODEL_SECONDARY="qwen/qwen3.8-27b",
        GROQ_MODEL_TERTIARY="openai/gpt-oss-120b",
    )

    configurations = available_model_configurations(settings)

    assert [(configuration.selection, configuration.metadata.model) for configuration in configurations] == [
        ("primary", "openai/gpt-oss-20b"),
        ("secondary", "qwen/qwen3.8-27b"),
        ("tertiary", "openai/gpt-oss-120b"),
    ]


def test_factory_omits_unconfigured_optional_groq_selections() -> None:
    settings = Settings(_env_file=None, LLM_PROVIDER="groq", GROQ_MODEL="configured-model")

    configurations = available_model_configurations(settings)

    assert [(configuration.selection, configuration.metadata.model) for configuration in configurations] == [
        ("primary", "configured-model"),
    ]


@pytest.mark.parametrize(
    ("provider", "model_field", "expected_location"),
    [
        ("groq", "GROQ_MODEL", "external"),
        ("openrouter", "OPENROUTER_MODEL", "external"),
        ("ollama", "OLLAMA_MODEL", "local"),
    ],
)
def test_factory_exposes_processing_location_from_provider_configuration(
    provider: str, model_field: str, expected_location: str
) -> None:
    resolved = resolve_provider_configuration(
        Settings(_env_file=None, LLM_PROVIDER=provider, **{model_field: "test-model"})
    )

    assert resolved.metadata.processing_location == expected_location


@pytest.mark.parametrize("provider", [None, "", "unsupported-provider"])
def test_factory_rejects_missing_or_unsupported_provider(provider: str | None) -> None:
    settings = Settings(_env_file=None, LLM_PROVIDER=provider)

    expected_error = (
        UnsupportedProviderError if provider == "unsupported-provider" else ProviderConfigurationError
    )
    with pytest.raises(expected_error):
        resolve_provider_configuration(settings)


def test_factory_requires_a_model_for_the_selected_provider() -> None:
    settings = Settings(_env_file=None, LLM_PROVIDER="ollama", OLLAMA_MODEL="")

    with pytest.raises(ProviderConfigurationError, match="No model is configured"):
        resolve_provider_configuration(settings)


def test_provider_failure_is_safe_traceable_and_preserves_original_cause(caplog) -> None:
    prompt = "prompt that must not be logged"
    secret = "secret-that-must-not-be-logged"
    original_error = RuntimeError(f"upstream failure: {prompt}; {secret}")
    model = Mock(spec=BaseChatModel)
    model.invoke.side_effect = original_error
    metadata = ProviderMetadata(
        provider="groq", model="llama-test", processing_location="external"
    )
    provider = LangChainLLMProvider(model=model, metadata=metadata)

    with caplog.at_level(logging.ERROR, logger="app.llm.langchain_provider"):
        with pytest.raises(ProviderInvocationError) as caught_error:
            provider.generate(LLMRequest(messages=(HumanMessage(content=prompt),)))

    error = caught_error.value
    assert error.metadata == metadata
    assert error.__cause__ is original_error
    assert str(error) == "LLM provider invocation failed (provider=groq, model=llama-test)."

    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.llm_provider == "groq"
    assert record.llm_model == "llama-test"
    assert record.error_type == "RuntimeError"
    assert prompt not in caplog.text
    assert secret not in caplog.text
