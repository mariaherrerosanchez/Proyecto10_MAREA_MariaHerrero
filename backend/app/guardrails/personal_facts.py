"""Deterministic signals for unsupported personal or business claims."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field

from app.prompts.models import GenerationContext

GuardrailCategory = Literal[
    "experience",
    "role",
    "company",
    "education_or_certification",
    "tool_or_technology",
    "metric_or_result",
    "achievement",
    "testimonial",
    "other_personal_fact",
]


class GuardrailFinding(BaseModel):
    """A safe classification signal that deliberately omits generated text."""

    category: GuardrailCategory
    reason: str


class GuardrailAssessment(BaseModel):
    """Outcome of local claim detection; flags always retain human review."""

    findings: list[GuardrailFinding] = Field(default_factory=list)
    review_required: bool = False


_RULES: tuple[tuple[GuardrailCategory, str, re.Pattern[str]], ...] = (
    (
        "experience",
        "Posible experiencia profesional no respaldada.",
        re.compile(
            r"\b(?:he trabajado|trabajé|cuento con \d+ años de experiencia|"
            r"tengo \d+ años de experiencia)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "role",
        "Posible puesto o rol no respaldado.",
        re.compile(
            r"\b(?:soy|he sido|trabajo como)\s+(?:un[ao]\s+)?"
            r"(?:desarrollador(?:a)?|ingenier[oa]|consultor(?:a)?|director(?:a)?|"
            r"manager|especialista|analista|profesor(?:a)?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "company",
        "Posible empresa atribuida sin respaldo.",
        re.compile(
            r"\b(?:trabaj(?:o|é)|colabor(?:o|é))\s+(?:en|para)\s+"
            r"[A-ZÁÉÍÓÚÜÑ][\wÁÉÍÓÚÜÑ-]*(?:\s+[A-ZÁÉÍÓÚÜÑ][\wÁÉÍÓÚÜÑ-]*)*",
            re.IGNORECASE,
        ),
    ),
    (
        "education_or_certification",
        "Posible formación o certificación no respaldada.",
        re.compile(
            r"\b(?:tengo|poseo|cuento con)\s+(?:un(?:a|o)?\s+)?"
            r"(?:grado|máster|master|doctorado|certificaci[oó]n|certificado)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "tool_or_technology",
        "Posible dominio de herramienta o tecnología no respaldado.",
        re.compile(
            r"\b(?:domino|manejo|uso(?: profesionalmente)?|soy experto(?:a)? en)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "metric_or_result",
        "Posible métrica o resultado no respaldado.",
        re.compile(
            r"\b(?:aumenté|incrementé|reduje|mejoré|conseguí)\b.{0,60}"
            r"(?:\d+\s*%|\d+\s+(?:clientes|proyectos|personas)|resultados?)",
            re.IGNORECASE,
        ),
    ),
    (
        "achievement",
        "Posible logro no respaldado.",
        re.compile(r"\b(?:he logrado|he conseguido|mi mayor logro)\b", re.IGNORECASE),
    ),
    (
        "testimonial",
        "Posible testimonio no respaldado.",
        re.compile(r"\bmis clientes (?:dicen|afirman|destacan)\b", re.IGNORECASE),
    ),
    (
        "other_personal_fact",
        "Posible hecho personal o de negocio no respaldado.",
        re.compile(
            r"\b(?:mi empresa|mi equipo|mi trayectoria|he publicado|he liderado)\b",
            re.IGNORECASE,
        ),
    ),
)

_TOOL_CLAIM_PATTERN = re.compile(
    r"\b(?:domino|manejo|uso(?: profesionalmente)?|soy experto(?:a)? en)\s+"
    r"(?P<tool>[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\w+.#/-]*)",
    re.IGNORECASE,
)


class PersonalFactGuardrail:
    """Flag unsupported claims when the structured request has no matching evidence.

    This deliberately produces review signals instead of asserting that a claim is false:
    only a future verified-source feature can establish factual truth.
    """

    def assess(self, text: str, context: GenerationContext) -> GuardrailAssessment:
        """Return safe category-level signals without logging or storing generated text."""

        findings: list[GuardrailFinding] = []
        for category, reason, pattern in _RULES:
            if pattern.search(text) and not self._has_explicit_evidence(category, text, context):
                findings.append(GuardrailFinding(category=category, reason=reason))
        return GuardrailAssessment(
            findings=findings,
            review_required=bool(findings),
        )

    @staticmethod
    def _has_explicit_evidence(
        category: GuardrailCategory,
        text: str,
        context: GenerationContext,
    ) -> bool:
        if category != "tool_or_technology" or context.profile_context is None:
            return False

        claimed_tools = {
            match.group("tool").casefold()
            for match in _TOOL_CLAIM_PATTERN.finditer(text)
        }
        supported_tools = {
            competency.casefold()
            for competency in context.profile_context.competencies
        }
        return bool(claimed_tools) and claimed_tools.issubset(supported_tools)
