"""Safe HTTP error translation for the generation boundary."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.generation.errors import GenerationUnavailableError
from app.llm.factory import ProviderConfigurationError, ProviderNotImplementedError
from app.llm.provider import ProviderInvocationError

logger = logging.getLogger(__name__)


def register_exception_handlers(application: FastAPI) -> None:
    """Register safe responses without exposing provider internals."""

    @application.exception_handler(ProviderNotImplementedError)
    async def provider_not_implemented_error_handler(
        _: Request,
        error: ProviderNotImplementedError,
    ) -> JSONResponse:
        logger.warning(
            "Configured LLM provider is not implemented",
            extra={"error_type": type(error).__name__},
        )
        return _error_response(
            status_code=503,
            code="provider_not_available",
            detail="El proveedor seleccionado todavía no está disponible.",
        )

    @application.exception_handler(ProviderConfigurationError)
    async def provider_configuration_error_handler(
        _: Request,
        error: ProviderConfigurationError,
    ) -> JSONResponse:
        logger.warning(
            "LLM generation is not configured",
            extra={"error_type": type(error).__name__},
        )
        return _error_response(
            status_code=503,
            code="provider_not_configured",
            detail="La generación aún no está configurada. Revisa el proveedor y el modelo.",
        )

    @application.exception_handler(ProviderInvocationError)
    async def provider_invocation_error_handler(
        _: Request,
        error: ProviderInvocationError,
    ) -> JSONResponse:
        logger.error(
            "LLM provider invocation could not complete",
            extra={
                "llm_provider": error.metadata.provider,
                "llm_model": error.metadata.model,
                "error_type": type(error).__name__,
            },
        )
        return _error_response(
            status_code=502,
            code="provider_request_failed",
            detail="No se ha podido generar el texto en este momento. Inténtalo de nuevo.",
        )

    @application.exception_handler(GenerationUnavailableError)
    async def generation_unavailable_error_handler(
        _: Request,
        error: GenerationUnavailableError,
    ) -> JSONResponse:
        logger.error(
            "Unexpected generation error",
            extra={"error_type": type(error).__name__},
        )
        return _error_response(
            status_code=500,
            code="generation_unavailable",
            detail="La generación no está disponible en este momento.",
        )


def _error_response(status_code: int, code: str, detail: str) -> JSONResponse:
    """Build the stable, public error payload for the technical endpoint."""

    return JSONResponse(status_code=status_code, content={"code": code, "detail": detail})
