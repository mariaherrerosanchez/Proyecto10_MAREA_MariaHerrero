"""HTTP tests for the public, source-attributed Radar boundary."""

from datetime import UTC, datetime

from fastapi.testclient import TestClient

import pytest

from app.api.radar import get_radar_service, normalize_topics
from app.core.config import Settings
from app.main import create_app
from app.radar.models import RadarNewsItem, RadarNewsResponse, RadarSourceStatus


class StubRadarService:
    def __init__(self) -> None:
        self.topics: tuple[str, ...] | None = None

    def get_news(self, topics: tuple[str, ...] = ()) -> RadarNewsResponse:
        self.topics = topics
        fetched_at = datetime(2026, 10, 9, 9, tzinfo=UTC)
        return RadarNewsResponse(
            items=[
                RadarNewsItem(
                    title="Titular real de RSS",
                    source_id="elpais-tecnologia",
                    source_name="EL PAÍS · Tecnología",
                    source_kind="verified_feed",
                    published_at=None,
                    original_url="https://example.org/original",
                    fetched_at=fetched_at,
                )
            ],
            sources=[
                RadarSourceStatus(
                    source_id="elpais-tecnologia",
                    source_name="EL PAÍS · Tecnología",
                    source_kind="verified_feed",
                    status="success",
                    fetched_at=fetched_at,
                )
            ],
            fetched_at=fetched_at,
        )


def test_radar_news_returns_source_attributed_external_metadata() -> None:
    application = create_app(Settings(_env_file=None))
    service = StubRadarService()
    application.dependency_overrides[get_radar_service] = lambda: service
    client = TestClient(application)

    response = client.get("/radar/news")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "title": "Titular real de RSS",
                "source_id": "elpais-tecnologia",
                "source_name": "EL PAÍS · Tecnología",
                "source_kind": "verified_feed",
                "published_at": None,
                "original_url": "https://example.org/original",
                "fetched_at": "2026-10-09T09:00:00Z",
            }
        ],
        "sources": [
            {
                "source_id": "elpais-tecnologia",
                "source_name": "EL PAÍS · Tecnología",
                "source_kind": "verified_feed",
                "status": "success",
                "fetched_at": "2026-10-09T09:00:00Z",
                "error_code": None,
            }
        ],
        "fetched_at": "2026-10-09T09:00:00Z",
    }
    assert service.topics == ()


def test_radar_news_normalizes_repeated_topics_before_searching() -> None:
    application = create_app(Settings(_env_file=None))
    service = StubRadarService()
    application.dependency_overrides[get_radar_service] = lambda: service
    client = TestClient(application)

    response = client.get(
        "/radar/news",
        params=[("topics", " Inteligencia   Artificial "), ("topics", "inteligencia artificial")],
    )

    assert response.status_code == 200
    assert service.topics == ("Inteligencia Artificial",)


@pytest.mark.parametrize(
    "topics",
    [
        [""],
        ["https://example.org/rss"],
        ["www.example.org"],
        ["a" * 81],
        ["uno", "dos", "tres"],
    ],
)
def test_radar_news_rejects_unsafe_or_invalid_topics(topics: list[str]) -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_radar_service] = StubRadarService
    client = TestClient(application)

    response = client.get("/radar/news", params=[("topics", topic) for topic in topics])

    assert response.status_code == 422


def test_normalize_topics_allows_at_most_two_safe_terms() -> None:
    assert normalize_topics(["Gastronomía", "Educación"]) == ("Gastronomía", "Educación")
