"""Typed prompt context and transient trace data."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ProfilePromptContext(BaseModel):
    """Editorial profile data already resolved by a future profile feature."""

    instructions: list[RequiredText] = Field(default_factory=list)
    niches: list[RequiredText] = Field(default_factory=list)
    competencies: list[RequiredText] = Field(default_factory=list)


class GenerationContext(BaseModel):
    """Explicit request data used to build one structured prompt."""

    model_config = ConfigDict(extra="forbid")

    topic: RequiredText
    objective: RequiredText
    audience: RequiredText
    tone: RequiredText
    language: RequiredText
    platform: RequiredText
    niches: list[RequiredText] = Field(default_factory=list)
    subniche: str | None = None
    additional_context: str | None = None
    profile_context: ProfilePromptContext | None = None

    @field_validator("subniche", "additional_context", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        """Treat blank optional values as absent instead of rendering empty sections."""

        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class PromptTrace(BaseModel):
    """Transient configuration snapshot until trace persistence is implemented."""

    prompt_version: Literal["v4"] = "v4"
    context: GenerationContext
