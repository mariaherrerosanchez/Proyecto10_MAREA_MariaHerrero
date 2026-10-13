"""HTTP boundary for transient translations of existing drafts."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import GenerationServiceFactory, get_generation_service_factory
from app.generation.errors import GenerationUnavailableError
from app.llm.factory import ProviderConfigurationError
from app.llm.provider import ProviderInvocationError
from app.translation.models import TranslationRequest, TranslationResponse
from app.translation.prompt_builder import TranslationPromptBuilder
from app.translation.service import TranslationService
from app.translation.service import TranslationUnavailableError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/translation", tags=["translation"])


@router.post("", response_model=TranslationResponse)
def translate_draft(
    request: TranslationRequest,
    factory: Annotated[GenerationServiceFactory, Depends(get_generation_service_factory)],
) -> TranslationResponse:
    """Translate one submitted draft without rebuilding it from generation context."""

    try:
        response = TranslationService(
            factory.create_provider(request.model_selection),
            TranslationPromptBuilder(),
        ).translate(request)
    except ProviderConfigurationError:
        raise
    except ProviderInvocationError as error:
        raise TranslationUnavailableError() from error
    except Exception as error:
        logger.error(
            "Unexpected translation service error",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error

    return TranslationResponse(
        text=response.text,
        target_language=request.target_language,
        provider=response.metadata.provider,
        model=response.metadata.model,
        processing_location=response.metadata.processing_location,
    )
