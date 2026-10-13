"""HTTP boundary for explicit stock-image searches."""

from typing import Annotated
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import Settings, get_settings
from app.images.demo_provider import DemoImageSearchProvider
from app.images.models import StockImageSearchResponse
from app.images.pexels_provider import PexelsImageSearchProvider
from app.images.search_provider import (
    ImageSearchProviderError,
)
from app.images.service import ImageSearchService

router = APIRouter(prefix="/images", tags=["images"])


def get_image_search_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ImageSearchService:
    """Create the explicitly configured provider; never fall back after failures."""

    if settings.image_search_provider == "demo":
        return ImageSearchService(DemoImageSearchProvider())

    if not settings.pexels_api_key:
        raise HTTPException(
            status_code=503,
            detail="La búsqueda de imágenes no está configurada ahora.",
        )
    return ImageSearchService(
        PexelsImageSearchProvider(
            settings.pexels_api_key,
            timeout_seconds=settings.image_search_timeout_seconds,
        )
    )


@router.get("/search", response_model=StockImageSearchResponse)
def search_stock_images(
    query: Annotated[str, Query(max_length=120)],
    service: Annotated[ImageSearchService, Depends(get_image_search_service)],
) -> StockImageSearchResponse:
    """Search the configured provider only after a user submits a validated query."""

    normalized_query = normalize_image_query(query)
    try:
        result = service.search(normalized_query)
        return result.model_copy(update={"items": result.items[:6]})
    except ImageSearchProviderError as error:
        raise HTTPException(
            status_code=502,
            detail="No se han podido buscar imágenes ahora. Inténtalo de nuevo.",
        ) from error


def normalize_image_query(query: str) -> str:
    """Allow a concise search phrase, never a provider URL or blank value."""

    normalized = " ".join(query.split())
    if not normalized:
        raise HTTPException(status_code=422, detail="La consulta de imagen no puede estar vacía.")
    if _looks_like_url(normalized):
        raise HTTPException(status_code=422, detail="La consulta de imagen debe ser texto, no una URL.")
    return normalized


def _looks_like_url(value: str) -> bool:
    parsed = urlsplit(value)
    return bool(parsed.scheme or parsed.netloc or "://" in value or value.casefold().startswith("www."))
