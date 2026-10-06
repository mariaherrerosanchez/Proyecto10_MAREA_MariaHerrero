"""Tests for structured prompt construction without invoking an LLM."""

import pytest
from pydantic import ValidationError
from langchain_core.messages import HumanMessage, SystemMessage

from app.prompts.builder import PromptBuilder
from app.prompts.models import GenerationContext, ProfilePromptContext


def complete_context() -> GenerationContext:
    return GenerationContext(
        topic="Cómo explicar IA sin tecnicismos",
        niche="Tecnología",
        subniche="Inteligencia Artificial",
        objective="Divulgación",
        audience="Responsables de RR. HH. sin conocimientos técnicos",
        tone="Cercano y profesional",
        language="es",
        additional_context="Incluye un ejemplo breve con tildes: innovación.",
        platform="linkedin",
        profile_context=ProfilePromptContext(
            instructions=["Evita jerga innecesaria."],
            niches=["Tecnología", "IA responsable"],
            competencies=["Divulgación", "Transformación digital"],
        ),
    )


def test_prompt_builder_includes_structured_context_in_system_and_user_messages() -> None:
    result = PromptBuilder().build(complete_context())

    assert isinstance(result.request.messages[0], SystemMessage)
    assert isinstance(result.request.messages[1], HumanMessage)
    user_message = str(result.request.messages[1].content)
    assert "Tema: Cómo explicar IA sin tecnicismos" in user_message
    assert "Nicho: Tecnología" in user_message
    assert "Subnicho: Inteligencia Artificial" in user_message
    assert "Audiencia: Responsables de RR. HH. sin conocimientos técnicos" in user_message
    assert "Plataforma solicitada: linkedin" in user_message
    assert "Contexto adicional: Incluye un ejemplo breve con tildes: innovación." in user_message
    assert "Nicho: Tecnología" in user_message
    assert "Audiencia:" in user_message
    assert result.trace.prompt_version == "v1"
    assert result.trace.context == complete_context()


def test_prompt_builder_omits_absent_optional_sections_without_rendering_none() -> None:
    context = GenerationContext(
        topic="Tema",
        niche="Educación",
        objective="Informar",
        audience="Docentes",
        tone="Claro",
        language="es",
        platform="blog",
        subniche="   ",
        additional_context=" ",
    )

    result = PromptBuilder().build(context)
    user_message = str(result.request.messages[1].content)

    assert "Subnicho:" not in user_message
    assert "Contexto adicional:" not in user_message
    assert "perfil" not in user_message.lower()
    assert "None" not in user_message


def test_profile_context_extends_prompt_without_changing_base_fields() -> None:
    result = PromptBuilder().build(complete_context())
    user_message = str(result.request.messages[1].content)

    assert "Instrucciones del perfil:\n- Evita jerga innecesaria." in user_message
    assert "Nichos del perfil:\n- Tecnología\n- IA responsable" in user_message
    assert "Competencias del perfil:\n- Divulgación\n- Transformación digital" in user_message


@pytest.mark.parametrize(
    "required_field",
    ["topic", "niche", "objective", "audience", "tone", "language", "platform"],
)
def test_generation_context_requires_every_core_field(required_field: str) -> None:
    context_data = complete_context().model_dump()
    context_data.pop(required_field)

    with pytest.raises(ValidationError):
        GenerationContext.model_validate(context_data)
