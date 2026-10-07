"""Tests for structured prompt construction without invoking an LLM."""

import pytest
from pydantic import ValidationError
from langchain_core.messages import HumanMessage, SystemMessage

from app.prompts.builder import PromptBuilder
from app.prompts.models import GenerationContext, ProfilePromptContext


def complete_context() -> GenerationContext:
    return GenerationContext(
        topic="Cómo explicar IA sin tecnicismos",
        niches=["Inteligencia Artificial", "QA / Testing"],
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
    assert isinstance(result.request.messages[1], SystemMessage)
    assert isinstance(result.request.messages[2], SystemMessage)
    assert isinstance(result.request.messages[3], HumanMessage)
    linkedin_instructions = str(result.request.messages[2].content)
    user_message = str(result.request.messages[3].content)
    assert "Tema: Cómo explicar IA sin tecnicismos" in user_message
    assert "Nichos de la solicitud:\n- Inteligencia Artificial\n- QA / Testing" in user_message
    assert "Subnicho o especialización adicional: Inteligencia Artificial" in user_message
    assert "Audiencia: Responsables de RR. HH. sin conocimientos técnicos" in user_message
    assert "Plataforma solicitada: linkedin" in user_message
    assert "Contexto adicional: Incluye un ejemplo breve con tildes: innovación." in user_message
    assert "Audiencia:" in user_message
    assert "Instrucciones editoriales para LinkedIn" in linkedin_instructions
    assert "clickbait artificial" in linkedin_instructions
    assert "engagement bait" in linkedin_instructions
    assert result.trace.prompt_version == "v4"
    assert result.trace.context == complete_context()


def test_prompt_builder_includes_personal_fact_guardrail_instructions() -> None:
    result = PromptBuilder().build(complete_context())

    system_message = "\n".join(
        str(message.content)
        for message in result.request.messages
        if isinstance(message, SystemMessage)
    )

    assert "No atribuyas" in system_message
    assert "testimonios" in system_message


def test_prompt_builder_omits_absent_optional_sections_without_rendering_none() -> None:
    context = GenerationContext(
        topic="Tema",
        niches=["Educación"],
        objective="Informar",
        audience="Docentes",
        tone="Claro",
        language="es",
        platform="blog",
        subniche="   ",
        additional_context=" ",
    )

    result = PromptBuilder().build(context)
    user_message = str(result.request.messages[-1].content)

    assert "Subnicho:" not in user_message
    assert "Contexto adicional:" not in user_message
    assert "perfil" not in user_message.lower()
    assert "None" not in user_message


def test_prompt_builder_omits_empty_request_niches_but_preserves_audience_and_subniche() -> None:
    context = GenerationContext(
        topic="Tema sin nicho definido",
        niches=[],
        subniche="Evaluación de sistemas de IA",
        objective="Informar",
        audience="Personas interesadas en aprender",
        tone="Claro",
        language="es",
        platform="blog",
    )

    result = PromptBuilder().build(context)
    user_message = str(result.request.messages[-1].content)

    assert "Nichos de la solicitud:" not in user_message
    assert "[]" not in user_message
    assert "Subnicho o especialización adicional: Evaluación de sistemas de IA" in user_message
    assert "Audiencia: Personas interesadas en aprender" in user_message
    assert "None" not in user_message


@pytest.mark.parametrize(
    ("niches", "subniche"),
    [
        ([], "Evaluación de sistemas de IA"),
        (["Educación"], "Formación híbrida"),
        (["Inteligencia Artificial", "QA / Testing"], "Testing de sistemas de IA"),
    ],
)
def test_subniche_is_an_optional_specialization_for_any_number_of_niches(
    niches: list[str], subniche: str
) -> None:
    context = GenerationContext(
        topic="Tema",
        niches=niches,
        subniche=subniche,
        objective="Informar",
        audience="Personas interesadas",
        tone="Claro",
        language="es",
        platform="blog",
    )

    result = PromptBuilder().build(context)
    user_message = str(result.request.messages[-1].content)

    assert f"Subnicho o especialización adicional: {subniche}" in user_message


def test_profile_context_extends_prompt_without_changing_base_fields() -> None:
    result = PromptBuilder().build(complete_context())
    user_message = str(result.request.messages[-1].content)

    assert "Instrucciones del perfil:\n- Evita jerga innecesaria." in user_message
    assert "Nichos del perfil:\n- Tecnología\n- IA responsable" in user_message
    assert "Competencias del perfil:\n- Divulgación\n- Transformación digital" in user_message


def test_prompt_builder_does_not_apply_linkedin_rules_to_another_platform() -> None:
    context = complete_context().model_copy(update={"platform": "blog"})

    result = PromptBuilder().build(context)

    assert len(result.request.messages) == 3
    assert "No atribuyas" in str(result.request.messages[1].content)
    assert all(
        "Instrucciones editoriales para LinkedIn" not in str(message.content)
        for message in result.request.messages
    )


@pytest.mark.parametrize(
    "required_field",
    ["topic", "objective", "audience", "tone", "language", "platform"],
)
def test_generation_context_requires_every_core_field(required_field: str) -> None:
    context_data = complete_context().model_dump()
    context_data.pop(required_field)

    with pytest.raises(ValidationError):
        GenerationContext.model_validate(context_data)
