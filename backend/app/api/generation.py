"""Technical HTTP boundary for the first configured LLM."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, StringConstraints

from app.api.dependencies import get_generation_service
from app.generation.errors import GenerationUnavailableError
from app.generation.service import GenerationService
from app.llm.provider import ProviderInvocationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generation", tags=["generation"])


class GenerationRequestBody(BaseModel):
    """Minimal input accepted before structured prompt generation exists."""

    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class GenerationResponseBody(BaseModel):
    """Normalized text and provider metadata returned by the endpoint."""

    text: str
    provider: str
    model: str


@router.post("", response_model=GenerationResponseBody)
def generate_text(
    request: GenerationRequestBody,
    service: Annotated[GenerationService, Depends(get_generation_service)],
) -> GenerationResponseBody:
    """Generate text from an already-built raw prompt."""

    try:
        response = service.generate(request.prompt)
    except ProviderInvocationError:
        raise
    except Exception as error:
        logger.error(
            "Unexpected generation service error",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error

    return GenerationResponseBody(
        text=response.text,
        provider=response.metadata.provider,
        model=response.metadata.model,
    )
