"""HTTP boundary for public RSS news signals used by the Radar MVP."""

from typing import Annotated
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import Settings, get_settings
from app.radar.models import RadarNewsResponse
from app.radar.rss_client import RssFeedClient
from app.radar.service import RadarService

router = APIRouter(prefix="/radar", tags=["radar"])


def get_radar_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> RadarService:
    """Assemble a trusted-source service without coupling it to generation."""

    return RadarService(
        settings.radar_source_ids,
        RssFeedClient(
            timeout_seconds=settings.radar_request_timeout_seconds,
            max_feed_bytes=settings.radar_max_feed_bytes,
        ),
    )


@router.get("/news", response_model=RadarNewsResponse)
def get_radar_news(
    service: Annotated[RadarService, Depends(get_radar_service)],
    topics: Annotated[list[str] | None, Query()] = None,
) -> RadarNewsResponse:
    """Return current RSS metadata, never generated content or article bodies."""

    normalized_topics = normalize_topics(topics or [])
    if not normalized_topics:
        return service.get_news()
    return service.get_news(topics=normalized_topics)


def normalize_topics(topics: list[str]) -> tuple[str, ...]:
    """Reject unsafe query input before constructing internal Google News URLs."""

    if len(topics) > 2:
        raise HTTPException(status_code=422, detail="Se permiten como máximo dos intereses.")

    normalized_topics: list[str] = []
    for topic in topics:
        normalized = " ".join(topic.split())
        if not normalized:
            raise HTTPException(status_code=422, detail="Los intereses no pueden estar vacíos.")
        if len(normalized) > 80:
            raise HTTPException(status_code=422, detail="Cada interés debe tener como máximo 80 caracteres.")
        if _looks_like_url(normalized):
            raise HTTPException(status_code=422, detail="Los intereses deben ser términos de búsqueda, no URLs.")
        if normalized.casefold() not in {item.casefold() for item in normalized_topics}:
            normalized_topics.append(normalized)

    return tuple(normalized_topics)


def _looks_like_url(value: str) -> bool:
    parsed = urlsplit(value)
    return bool(parsed.scheme or parsed.netloc or "://" in value or value.casefold().startswith("www."))
