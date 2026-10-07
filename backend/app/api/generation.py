"""Technical HTTP boundary for the first configured LLM."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import get_generation_service
from app.generation.errors import GenerationUnavailableError
from app.generation.service import GenerationService
from app.guardrails.personal_facts import GuardrailAssessment
from app.llm.provider import ProviderInvocationError
from app.prompts.models import GenerationContext, PromptTrace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generation", tags=["generation"])


class GenerationResponseBody(BaseModel):
    """Normalized text and provider metadata returned by the endpoint."""

    text: str
    provider: str
    model: str
    trace: PromptTrace
    guardrails: GuardrailAssessment


@router.post("", response_model=GenerationResponseBody)
def generate_text(
    request: GenerationContext,
    service: Annotated[GenerationService, Depends(get_generation_service)],
) -> GenerationResponseBody:
    """Generate text from an already-built raw prompt."""

    try:
        result = service.generate(request)
    except ProviderInvocationError:
        raise
    except Exception as error:
        logger.error(
            "Unexpected generation service error",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error

    return GenerationResponseBody(
        text=result.response.text,
        provider=result.response.metadata.provider,
        model=result.response.metadata.model,
        trace=result.trace,
        guardrails=result.guardrails,
    )
