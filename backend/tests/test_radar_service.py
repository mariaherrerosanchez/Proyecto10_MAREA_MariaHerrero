"""Tests for source isolation and date ordering in the Radar service."""

from datetime import UTC, datetime, timedelta

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
        "source_kind": "verified_feed",
        "status": "error",
        "error_code": "source_configuration_invalid",
    }


def test_service_returns_only_recent_dated_and_bounded_google_news_results() -> None:
    now = datetime.now(UTC)
    dynamic_entries = [
        entry(f"recent-{index}", now)
        for index in range(12)
    ] + [
        entry("old", now - timedelta(days=15)),
        entry("undated", None),
    ]
    service = RadarService(
        ("elpais-tecnologia",),
        StubFetcher(
            {
                "elpais-tecnologia": [],
                "google-news-1": dynamic_entries,
            }
        ),
    )

    response = service.get_news(topics=("Inteligencia Artificial",))

    dynamic_items = [item for item in response.items if item.source_kind == "search_aggregator"]
    assert len(dynamic_items) == 10
    assert {item.title for item in dynamic_items} == {f"recent-{index}" for index in range(10)}
    assert all(item.published_at is not None for item in dynamic_items)
    assert response.sources[-1].model_dump(exclude={"fetched_at"}) == {
        "source_id": "google-news-1",
        "source_name": "Google News · Inteligencia Artificial",
        "source_kind": "search_aggregator",
        "status": "success",
        "error_code": None,
    }


def test_service_deduplicates_dynamic_results_and_keeps_verified_sources_when_search_fails() -> None:
    now = datetime.now(UTC)
    service = RadarService(
        ("elpais-tecnologia",),
        StubFetcher(
            {
                "elpais-tecnologia": [entry("Titular compartido", now)],
                "google-news-1": [entry(" titular   compartido ", now)],
                "google-news-2": RuntimeError("upstream"),
            }
        ),
    )

    response = service.get_news(topics=("IA", "QA"))

    assert [item.title for item in response.items] == ["Titular compartido"]
    assert [status.source_kind for status in response.sources] == [
        "verified_feed",
        "search_aggregator",
        "search_aggregator",
    ]
    assert response.sources[-1].model_dump(exclude={"fetched_at"}) == {
        "source_id": "google-news-2",
        "source_name": "Google News · QA",
        "source_kind": "search_aggregator",
        "status": "error",
        "error_code": "source_unavailable",
    }
