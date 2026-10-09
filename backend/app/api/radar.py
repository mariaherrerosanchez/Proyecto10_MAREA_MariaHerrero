"""HTTP boundary for public RSS news signals used by the Radar MVP."""

from typing import Annotated

from fastapi import APIRouter, Depends

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
) -> RadarNewsResponse:
    """Return current RSS metadata, never generated content or article bodies."""

    return service.get_news()
