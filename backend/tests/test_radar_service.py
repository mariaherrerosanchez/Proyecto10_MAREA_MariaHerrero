"""Tests for source isolation and date ordering in the Radar service."""

from datetime import UTC, datetime

from app.radar.rss_client import RssEntry
from app.radar.service import RadarService
from app.radar.sources import RssSource


class StubFetcher:
    def __init__(self, responses: dict[str, list[RssEntry] | Exception]) -> None:
        self._responses = responses

    def fetch(self, source: RssSource) -> list[RssEntry]:
        response = self._responses[source.source_id]
        if isinstance(response, Exception):
            raise response
        return response


def entry(title: str, published_at: datetime | None) -> RssEntry:
    return RssEntry(title=title, original_url=f"https://example.org/{title}", published_at=published_at)


def test_service_sorts_known_dates_descending_and_keeps_missing_dates_last() -> None:
    service = RadarService(
        ("elpais-tecnologia", "elpais-ciencia"),
        StubFetcher(
            {
                "elpais-tecnologia": [entry("older", datetime(2026, 10, 7, tzinfo=UTC)), entry("undated", None)],
                "elpais-ciencia": [entry("newer", datetime(2026, 10, 8, tzinfo=UTC))],
            }
        ),
    )

    response = service.get_news()

    assert [item.title for item in response.items] == ["newer", "older", "undated"]
    assert [item.source_id for item in response.items] == ["elpais-ciencia", "elpais-tecnologia", "elpais-tecnologia"]
    assert all(status.status == "success" for status in response.sources)


def test_service_keeps_successful_news_when_another_source_fails() -> None:
    service = RadarService(
        ("elpais-tecnologia", "elpais-ciencia"),
        StubFetcher({"elpais-tecnologia": [entry("available", None)], "elpais-ciencia": RuntimeError("upstream")}),
    )

    response = service.get_news()

    assert [item.title for item in response.items] == ["available"]
    assert [(status.source_id, status.status, status.error_code) for status in response.sources] == [
        ("elpais-tecnologia", "success", None),
        ("elpais-ciencia", "error", "source_unavailable"),
    ]


def test_service_returns_empty_news_and_safe_statuses_when_all_sources_fail() -> None:
    service = RadarService(
        ("elpais-tecnologia", "elpais-ciencia"),
        StubFetcher({"elpais-tecnologia": RuntimeError(), "elpais-ciencia": RuntimeError()}),
    )

    response = service.get_news()

    assert response.items == []
    assert [status.error_code for status in response.sources] == ["source_unavailable", "source_unavailable"]


def test_service_reports_an_unknown_configured_source_without_attempting_network_access() -> None:
    response = RadarService(("unknown-source",), StubFetcher({})).get_news()

    assert response.items == []
    assert response.sources[0].model_dump(exclude={"fetched_at"}) == {
        "source_id": "unknown-source",
        "source_name": "Fuente no configurada",
        "status": "error",
        "error_code": "source_configuration_invalid",
    }
