"""Technical HTTP boundary for the first configured LLM."""

import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.dependencies import GenerationServiceFactory, get_generation_service_factory
from app.generation.errors import GenerationUnavailableError
from app.generation.service import (
    FailedPlatformGeneration,
    GenerationService,
    StructuredGenerationResult,
    SuccessfulPlatformGeneration,
)
from app.guardrails.personal_facts import GuardrailAssessment
from app.llm.factory import ProviderConfigurationError
from app.llm.provider import ProviderInvocationError
from app.prompts.models import (
    GenerationContext,
    MultichannelGenerationRequest,
    Platform,
    PromptTrace,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generation", tags=["generation"])


class GenerationResponseBody(BaseModel):
    """Normalized text and provider metadata returned by the endpoint."""

    text: str
    provider: str
    model: str
    processing_location: Literal["local", "external"]
    trace: PromptTrace
    guardrails: GuardrailAssessment


class AvailableGenerationModelBody(BaseModel):
    """A public, selectable configured model without private credentials."""

    selection: Literal["primary", "secondary", "tertiary"]
    provider: str
    model: str
    processing_location: Literal["local", "external"]


class MultichannelGenerationErrorBody(BaseModel):
    """Safe per-platform error information for a completed batch request."""

    code: Literal["provider_request_failed"]
    detail: str


class SuccessfulPlatformGenerationBody(BaseModel):
    status: Literal["success"]
    platform: Platform
    generation: GenerationResponseBody


class FailedPlatformGenerationBody(BaseModel):
    status: Literal["error"]
    platform: Platform
    error: MultichannelGenerationErrorBody


MultichannelGenerationResultBody = Annotated[
    SuccessfulPlatformGenerationBody | FailedPlatformGenerationBody,
    Field(discriminator="status"),
]


class MultichannelGenerationResponseBody(BaseModel):
    results: list[MultichannelGenerationResultBody]


@router.post("", response_model=GenerationResponseBody)
def generate_text(
    request: GenerationContext,
    factory: Annotated[GenerationServiceFactory, Depends(get_generation_service_factory)],
) -> GenerationResponseBody:
    """Generate text from an already-built raw prompt."""

    try:
        result = factory.create(request.model_selection).generate(request)
    except ProviderConfigurationError:
        raise
    except ProviderInvocationError:
        raise
    except Exception as error:
        logger.error(
            "Unexpected generation service error",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error

    return _generation_response_body(result)


@router.post("/multichannel", response_model=MultichannelGenerationResponseBody)
def generate_multichannel_text(
    request: MultichannelGenerationRequest,
    factory: Annotated[GenerationServiceFactory, Depends(get_generation_service_factory)],
) -> MultichannelGenerationResponseBody:
    """Generate independent drafts in the received platform order."""

    try:
        results = factory.create(request.model_selection).generate_many(request)
    except ProviderConfigurationError:
        raise
    except Exception as error:
        logger.error(
            "Unexpected multichannel generation service error",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error

    return MultichannelGenerationResponseBody(
        results=[_multichannel_result_body(result) for result in results]
    )


@router.get("/models", response_model=list[AvailableGenerationModelBody])
def get_available_models(
    factory: Annotated[GenerationServiceFactory, Depends(get_generation_service_factory)],
) -> list[AvailableGenerationModelBody]:
    """List selectable configured models without constructing clients or exposing secrets."""

    try:
        configurations = factory.available_models()
    except ProviderConfigurationError:
        raise
    except Exception as error:
        logger.error(
            "Unable to resolve configured generation models",
            extra={"error_type": type(error).__name__},
        )
        raise GenerationUnavailableError() from error

    return [
        AvailableGenerationModelBody(
            selection=configuration.selection,
            provider=configuration.metadata.provider,
            model=configuration.metadata.model,
            processing_location=configuration.metadata.processing_location,
        )
        for configuration in configurations
    ]


def _generation_response_body(result: StructuredGenerationResult) -> GenerationResponseBody:
    """Map the shared service result to the stable single-generation response."""

    return GenerationResponseBody(
        text=result.response.text,
        provider=result.response.metadata.provider,
        model=result.response.metadata.model,
        processing_location=result.response.metadata.processing_location,
        trace=result.trace,
        guardrails=result.guardrails,
    )


def _multichannel_result_body(
    result: SuccessfulPlatformGeneration | FailedPlatformGeneration,
) -> MultichannelGenerationResultBody:
    """Keep provider details private when one platform invocation fails."""

    if isinstance(result, SuccessfulPlatformGeneration):
        return SuccessfulPlatformGenerationBody(
            status="success",
            platform=result.platform,
            generation=_generation_response_body(result.generation),
        )
    return FailedPlatformGenerationBody(
        status="error",
        platform=result.platform,
        error=MultichannelGenerationErrorBody(
            code="provider_request_failed",
            detail="No se ha podido generar el texto en este momento. Inténtalo de nuevo.",
        ),
    )
