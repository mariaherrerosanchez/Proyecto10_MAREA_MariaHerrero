"""Typed prompt context and transient trace data."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.llm.types import ModelSelection

RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Platform = Literal["linkedin", "instagram", "facebook", "blog"]


class ProfilePromptContext(BaseModel):
    """Editorial profile data already resolved by a future profile feature."""

    instructions: list[RequiredText] = Field(default_factory=list)
    niches: list[RequiredText] = Field(default_factory=list)
    competencies: list[RequiredText] = Field(default_factory=list)


class GenerationRequestContext(BaseModel):
    """Shared editorial data for one or more platform-specific requests."""

    model_config = ConfigDict(extra="forbid")

    topic: RequiredText
    objective: RequiredText
    audience: RequiredText
    tone: RequiredText
    language: RequiredText
    model_selection: ModelSelection = "primary"
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


class GenerationContext(GenerationRequestContext):
    """Explicit request data used to build one structured prompt."""

    platform: Platform


class MultichannelGenerationRequest(GenerationRequestContext):
    """One editorial request that produces an independent piece per platform."""

    platforms: list[Platform] = Field(min_length=1)

    @field_validator("platforms")
    @classmethod
    def reject_duplicate_platforms(cls, platforms: list[Platform]) -> list[Platform]:
        """Avoid duplicate provider calls while preserving the selected order."""

        if len(platforms) != len(set(platforms)):
            raise ValueError("Las plataformas no pueden repetirse.")
        return platforms

    def context_for(self, platform: Platform) -> GenerationContext:
        """Materialize the existing single-platform context without changing its contract."""

        return GenerationContext(
            **self.model_dump(exclude={"platforms"}),
            platform=platform,
        )


class PromptTrace(BaseModel):
    """Transient configuration snapshot until trace persistence is implemented."""

    prompt_version: Literal["v7"] = "v7"
    context: GenerationContext
