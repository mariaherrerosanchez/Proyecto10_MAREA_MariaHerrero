"""Build structured LangChain messages from generation context."""

from dataclasses import dataclass

from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate

from app.llm.types import LLMRequest
from app.prompts.models import GenerationContext, ProfilePromptContext, PromptTrace
from app.prompts.platforms import editorial_rules_for
from app.prompts.templates import (
    GROUNDING_INSTRUCTIONS,
    MAREA_GENERAL_INSTRUCTIONS,
    USER_CONTEXT_TEMPLATE,
)


@dataclass(frozen=True, slots=True)
class PromptBuildResult:
    """Messages ready for a provider plus the configuration used to build them."""

    request: LLMRequest
    trace: PromptTrace


class PromptBuilder:
    """Compose one stable base prompt with optional request and profile sections."""

    def __init__(self) -> None:
        self._template = ChatPromptTemplate.from_messages(
            [
                ("system", MAREA_GENERAL_INSTRUCTIONS),
                ("system", GROUNDING_INSTRUCTIONS),
                ("human", USER_CONTEXT_TEMPLATE),
            ]
        )

    def build(self, context: GenerationContext) -> PromptBuildResult:
        """Format system and user messages without invoking a provider."""

        prompt_value = self._template.invoke(
            {
                "topic": context.topic,
                "objective": context.objective,
                "audience": context.audience,
                "tone": context.tone,
                "language": context.language,
                "platform": context.platform,
                "optional_sections": _optional_request_sections(context),
                "profile_sections": _profile_sections(context.profile_context),
            }
        )
        messages = list(prompt_value.messages)
        if rules := editorial_rules_for(context.platform):
            messages.insert(2, SystemMessage(content=rules.instructions))

        return PromptBuildResult(
            request=LLMRequest(messages=tuple(messages)),
            trace=PromptTrace(context=context),
        )


def _optional_request_sections(context: GenerationContext) -> str:
    request_niches = _format_list_sections(
        (("Nichos de la solicitud", context.niches),)
    )
    optional_text = _format_text_sections(
        (
            ("Subnicho o especialización adicional", context.subniche),
            ("Contexto adicional", context.additional_context),
        )
    )
    return request_niches + optional_text


def _profile_sections(profile: ProfilePromptContext | None) -> str:
    if profile is None:
        return ""

    return _format_list_sections(
        (
            ("Instrucciones del perfil", profile.instructions),
            ("Nichos del perfil", profile.niches),
            ("Competencias del perfil", profile.competencies),
        )
    )


def _format_text_sections(sections: tuple[tuple[str, str | None], ...]) -> str:
    return "".join(
        f"{label}: {value}\n" for label, value in sections if value is not None
    )


def _format_list_sections(sections: tuple[tuple[str, list[str]], ...]) -> str:
    return "".join(
        f"{label}:\n" + "\n".join(f"- {value}" for value in values) + "\n"
        for label, values in sections
        if values
    )
