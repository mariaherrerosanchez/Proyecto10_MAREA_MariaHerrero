"""Deterministic tests for local unsupported-claim signals."""

import pytest

from app.guardrails.personal_facts import PersonalFactGuardrail
from app.prompts.models import GenerationContext, ProfilePromptContext


def context(**overrides: object) -> GenerationContext:
    return GenerationContext(
        topic="Automatización",
        objective="Divulgación",
        audience="Personas no técnicas",
        tone="Cercano",
        language="es",
        platform="linkedin",
        **overrides,
    )


@pytest.mark.parametrize(
    ("text", "category"),
    [
        ("He trabajado durante 8 años en automatización.", "experience"),
        ("Soy ingeniera especializada en calidad.", "role"),
        ("Trabajé en Acme Labs creando productos.", "company"),
        ("Tengo un máster y una certificación internacional.", "education_or_certification"),
        ("Domino Python para crear pruebas.", "tool_or_technology"),
        ("Aumenté un 40% los resultados del equipo.", "metric_or_result"),
        ("He logrado transformar el proceso.", "achievement"),
        ("Mis clientes dicen que supero expectativas.", "testimonial"),
        ("He liderado un equipo internacional.", "other_personal_fact"),
    ],
)
def test_guardrail_flags_unsupported_personal_claim_categories(
    text: str,
    category: str,
) -> None:
    assessment = PersonalFactGuardrail().assess(text, context())

    assert assessment.review_required is True
    assert category in [finding.category for finding in assessment.findings]


def test_guardrail_allows_neutral_language_when_context_has_no_personal_facts() -> None:
    assessment = PersonalFactGuardrail().assess(
        "La automatización puede ayudar a revisar tareas repetitivas.",
        context(),
    )

    assert assessment.findings == []
    assert assessment.review_required is False


def test_guardrail_accepts_explicit_profile_competency_for_a_tool() -> None:
    assessment = PersonalFactGuardrail().assess(
        "Domino Python para explicar un ejemplo sencillo.",
        context(profile_context=ProfilePromptContext(competencies=["Python"])),
    )

    assert assessment.findings == []


def test_guardrail_flags_an_unsupported_tool_alongside_a_supported_one() -> None:
    assessment = PersonalFactGuardrail().assess(
        "Domino Kubernetes y uso Python para explicar un ejemplo.",
        context(profile_context=ProfilePromptContext(competencies=["Python"])),
    )

    assert assessment.review_required is True
    assert "tool_or_technology" in [finding.category for finding in assessment.findings]
