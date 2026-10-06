"""Dependency assembly for HTTP routes."""

import logging
from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.generation.errors import GenerationUnavailableError
from app.generation.service import GenerationService
from app.llm.factory import ProviderConfigurationError, create_llm_provider

logger = logging.getLogger(__name__)


def get_generation_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> GenerationService:
    """Create the service from private backend configuration."""

    try:
        return GenerationService(create_llm_provider(settings))
    except ProviderConfigurationError:
        raise
    except Exception as error:
        logger.error(
            "Unable to assemble generation service",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error
