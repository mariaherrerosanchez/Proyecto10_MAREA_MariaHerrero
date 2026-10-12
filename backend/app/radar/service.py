"""Aggregate current RSS metadata without classifying it as verified trends."""

from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.radar.models import RadarNewsItem, RadarNewsResponse, RadarSourceStatus
from app.radar.rss_client import RssEntry
from app.radar.sources import SOURCES_BY_ID, RssSource, google_news_source

_MAX_DYNAMIC_ITEMS_PER_TOPIC = 10
_DYNAMIC_NEWS_MAX_AGE = timedelta(days=14)


class FeedFetcher(Protocol):
    """Minimal boundary that keeps RSS retrieval testable without the network."""

    def fetch(self, source: RssSource) -> list[RssEntry]: ...


class RadarService:
    """Return source-attributed news while isolating each source failure."""

    def __init__(self, source_ids: tuple[str, ...], feed_fetcher: FeedFetcher) -> None:
        self._source_ids = source_ids
        self._feed_fetcher = feed_fetcher

    def get_news(self, topics: tuple[str, ...] = ()) -> RadarNewsResponse:
        fetched_at = datetime.now(UTC)
        items: list[RadarNewsItem] = []
        statuses: list[RadarSourceStatus] = []

        for source_id in self._source_ids:
            source = SOURCES_BY_ID.get(source_id)
            if source is None:
                statuses.append(
                    RadarSourceStatus(
                        source_id=source_id,
                        source_name="Fuente no configurada",
                        status="error",
                        error_code="source_configuration_invalid",
                        fetched_at=fetched_at,
                    )
                )
                continue

            source_items, source_status = self._fetch_source(source, fetched_at)
            items.extend(source_items)
            statuses.append(source_status)

        for index, topic in enumerate(topics, start=1):
            source_items, source_status = self._fetch_source(
                google_news_source(topic, index),
                fetched_at,
                dynamic=True,
            )
            items.extend(source_items)
            statuses.append(source_status)

        return RadarNewsResponse(
            items=sorted(
                _deduplicate(items),
                key=lambda item: item.published_at or datetime.min.replace(tzinfo=UTC),
                reverse=True,
            ),
            sources=statuses,
            fetched_at=fetched_at,
        )

    def _fetch_source(
        self,
        source: RssSource,
        fetched_at: datetime,
        *,
        dynamic: bool = False,
    ) -> tuple[list[RadarNewsItem], RadarSourceStatus]:
        try:
            entries = self._feed_fetcher.fetch(source)
        except Exception:
            return [], RadarSourceStatus(
                source_id=source.source_id,
                source_name=source.name,
                source_kind=source.source_kind,
                status="error",
                error_code="source_unavailable",
                fetched_at=fetched_at,
            )

        if dynamic:
            entries = _recent_entries(entries, fetched_at)

        return [
            RadarNewsItem(
                title=entry.title,
                source_id=source.source_id,
                source_name=source.name,
                source_kind=source.source_kind,
                published_at=entry.published_at,
                original_url=entry.original_url,
                fetched_at=fetched_at,
            )
            for entry in entries
        ], RadarSourceStatus(
            source_id=source.source_id,
            source_name=source.name,
            source_kind=source.source_kind,
            status="success",
            fetched_at=fetched_at,
        )


def _recent_entries(entries: list[RssEntry], fetched_at: datetime) -> list[RssEntry]:
    oldest_allowed = fetched_at - _DYNAMIC_NEWS_MAX_AGE
    return [
        entry
        for entry in entries
        if entry.published_at is not None
        and oldest_allowed <= entry.published_at <= fetched_at
    ][:_MAX_DYNAMIC_ITEMS_PER_TOPIC]


def _deduplicate(items: list[RadarNewsItem]) -> list[RadarNewsItem]:
    seen_titles: set[str] = set()
    unique_items: list[RadarNewsItem] = []
    for item in items:
        title_key = " ".join(item.title.casefold().split())
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        unique_items.append(item)
    return unique_items
