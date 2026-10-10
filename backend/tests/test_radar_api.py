"""HTTP tests for the public, source-attributed Radar boundary."""

from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.api.radar import get_radar_service
from app.core.config import Settings
from app.main import create_app
from app.radar.models import RadarNewsItem, RadarNewsResponse, RadarSourceStatus


class StubRadarService:
    def get_news(self) -> RadarNewsResponse:
        fetched_at = datetime(2026, 10, 9, 9, tzinfo=UTC)
        return RadarNewsResponse(
            items=[
                RadarNewsItem(
                    title="Titular real de RSS",
                    source_id="elpais-tecnologia",
                    source_name="EL PAÍS · Tecnología",
                    published_at=None,
                    original_url="https://example.org/original",
                    fetched_at=fetched_at,
                )
            ],
            sources=[
                RadarSourceStatus(
                    source_id="elpais-tecnologia",
                    source_name="EL PAÍS · Tecnología",
                    status="success",
                    fetched_at=fetched_at,
                )
            ],
            fetched_at=fetched_at,
        )


def test_radar_news_returns_source_attributed_external_metadata() -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_radar_service] = StubRadarService
    client = TestClient(application)

    response = client.get("/radar/news")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "title": "Titular real de RSS",
                "source_id": "elpais-tecnologia",
                "source_name": "EL PAÍS · Tecnología",
                "published_at": None,
                "original_url": "https://example.org/original",
                "fetched_at": "2026-10-09T09:00:00Z",
            }
        ],
        "sources": [
            {
                "source_id": "elpais-tecnologia",
                "source_name": "EL PAÍS · Tecnología",
                "status": "success",
                "fetched_at": "2026-10-09T09:00:00Z",
                "error_code": None,
            }
        ],
        "fetched_at": "2026-10-09T09:00:00Z",
    }
