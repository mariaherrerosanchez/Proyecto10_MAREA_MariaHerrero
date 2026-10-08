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
    "instagram": PlatformEditorialRules(
        platform="instagram",
        instructions="""Instrucciones editoriales para Instagram:
- Escribe un texto natural, cercano y fácil de consumir, adaptado a una publicación social visual sin asumir un tono informal.
- Abre con una idea capaz de captar atención sin clickbait artificial y desarrolla un mensaje principal claro.
- Favorece una estructura visualmente legible y párrafos breves, sin repetir fórmulas rígidas.
- Propón una llamada a la acción solo cuando aporte valor.
- Usa hashtags relevantes y moderados solo cuando ayuden a contextualizar, evitando bloques artificiales o spam.
- Usa emojis con moderación y solo cuando encajen con el tono solicitado.
- Evita engagement bait y lenguaje corporativo vacío.
- No presentes como propios hechos personales, profesionales, empresariales, métricas o logros no respaldados por el contexto.""",
    ),
    "facebook": PlatformEditorialRules(
        platform="facebook",
        instructions="""Instrucciones editoriales para Facebook:
- Escribe un texto natural, claro y conversacional, comprensible y cercano sin asumir un tono informal.
- Introduce el tema pronto, sin clickbait artificial, y desarrolla un mensaje principal claro con suficiente contexto para entenderlo dentro del feed.
- Favorece una estructura fácil de leer y párrafos razonablemente breves, sin fórmulas rígidas o repetitivas.
- Propón una llamada a la acción solo cuando resulte útil y natural; no uses preguntas artificiales para provocar comentarios.
- Usa pocos hashtags relevantes solo cuando aporten valor.
- Usa emojis de forma opcional y moderada, únicamente si encajan con el tono solicitado.
- Evita engagement bait, lenguaje corporativo vacío y lenguaje promocional.
- No presentes como propios hechos personales, profesionales, empresariales, estudios, herramientas, métricas, resultados, logros o testimonios no respaldados por el contexto.""",
    ),
    "blog": PlatformEditorialRules(
        platform="blog",
        instructions="""Instrucciones editoriales para Blog:
- Desarrolla contenido más profundo que una publicación de red social, evitando afirmaciones superficiales.
- Propón un título claro y relacionado con el tema, seguido de una introducción que explique qué encontrará la persona lectora y aporte contexto.
- Organiza las ideas con una progresión lógica; usa secciones y subtítulos descriptivos cuando la longitud o el contenido ayuden a comprenderlas.
- Escribe párrafos legibles y desarrolla suficientemente la idea principal; usa listas solo cuando mejoren realmente la comprensión.
- Cierra de forma coherente con una síntesis o conclusión útil; propone una llamada a la acción solo cuando tenga sentido para el objetivo.
- Determina el tono a partir del contexto, nichos y datos de perfil disponibles, no por el hecho de tratarse de un blog.
- Evita rellenar longitud con repeticiones, frases vacías, contenido genérico, SEO artificial, keyword stuffing o títulos clickbait.
- No inventes hechos personales, profesionales, empresariales, estudios, herramientas, métricas, resultados, logros, testimonios, citas, estudios, estadísticas, referencias, enlaces ni fuentes.""",
    ),
}


def editorial_rules_for(platform: str) -> PlatformEditorialRules | None:
    """Return optional rules from one registry so later platforms need no builder branching."""

    return _RULES_BY_PLATFORM.get(platform.casefold())
