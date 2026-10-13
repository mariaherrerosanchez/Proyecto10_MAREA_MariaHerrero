"""Validated, transient translation contracts."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.llm.types import ModelSelection, ProcessingLocation

TranslationText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000)]
TranslationLanguage = Literal["en", "fr", "it"]


class TranslationRequest(BaseModel):
    """One existing draft translated into an explicitly selected language."""

    model_config = ConfigDict(extra="forbid")

    text: TranslationText
    target_language: TranslationLanguage
    model_selection: ModelSelection = "primary"


class TranslationResponse(BaseModel):
    """Public translation result with non-sensitive provider metadata."""

    text: str
    target_language: TranslationLanguage
    provider: str
    model: str
    processing_location: ProcessingLocation
