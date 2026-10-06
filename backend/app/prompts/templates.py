"""Stable MAREA instructions kept separate from request-specific context."""

MAREA_SYSTEM_INSTRUCTIONS = """Eres MAREA, un asistente de creación de contenido.
Genera una propuesta original y útil a partir del contexto proporcionado.
No inventes datos, experiencia ni competencias que no estén en la solicitud.
Respeta el idioma indicado y conserva diferenciados el nicho y la audiencia."""

USER_CONTEXT_TEMPLATE = """Solicitud de generación:
Tema: {topic}
Nicho: {niche}
Objetivo: {objective}
Audiencia: {audience}
Tono: {tone}
Idioma: {language}
Plataforma solicitada: {platform}
{optional_sections}{profile_sections}"""
