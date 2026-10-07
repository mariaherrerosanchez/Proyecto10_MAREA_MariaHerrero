"""Platform editorial rules kept independent from generation context and providers."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PlatformEditorialRules:
    """Static editorial guidance for one platform, added as a system instruction."""

    platform: str
    instructions: str


_RULES_BY_PLATFORM: dict[str, PlatformEditorialRules] = {
    "linkedin": PlatformEditorialRules(
        platform="linkedin",
        instructions="""Instrucciones editoriales para LinkedIn:
- Escribe contenido profesional, natural y útil, sin adoptar un tono corporativo vacío.
- Abre con una idea capaz de captar atención sin clickbait artificial.
- Desarrolla una única idea central con una estructura fácil de leer y párrafos razonablemente breves.
- Construye un cierre coherente; propone una llamada a la acción o una invitación a conversar solo cuando aporte valor.
- Usa hashtags moderados y relevantes solo cuando ayuden a contextualizar la publicación.
- Evita engagement bait, exceso de emojis y fórmulas rígidas o repetitivas.
- No presentes como propias experiencias, cargos, empresas, estudios, herramientas, métricas o logros no respaldados por el contexto.""",
    ),
}


def editorial_rules_for(platform: str) -> PlatformEditorialRules | None:
    """Return optional rules from one registry so later platforms need no builder branching."""

    return _RULES_BY_PLATFORM.get(platform.casefold())
