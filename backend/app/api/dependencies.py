"""Dependency assembly for HTTP routes."""

import logging
from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.generation.errors import GenerationUnavailableError
from app.generation.service import GenerationService
from app.llm.factory import (
    ProviderConfigurationError,
    ResolvedProviderConfiguration,
    available_model_configurations,
    create_llm_provider,
)
from app.llm.types import ModelSelection
from app.prompts.builder import PromptBuilder

logger = logging.getLogger(__name__)


class GenerationServiceFactory:
    """Create per-request generation services for the selected configured model."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def create(self, selection: ModelSelection) -> GenerationService:
        return GenerationService(create_llm_provider(self._settings, selection), PromptBuilder())

    def available_models(self) -> tuple[ResolvedProviderConfiguration, ...]:
        return available_model_configurations(self._settings)


def get_generation_service_factory(
    settings: Annotated[Settings, Depends(get_settings)],
) -> GenerationServiceFactory:
    """Expose configured model services without leaking private credentials."""

    try:
        return GenerationServiceFactory(settings)
    except ProviderConfigurationError:
        raise
    except Exception as error:
        logger.error(
            "Unable to assemble generation service",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error
