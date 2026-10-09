"""Aggregate current RSS metadata without classifying it as verified trends."""

from datetime import UTC, datetime
from typing import Protocol

from app.radar.models import RadarNewsItem, RadarNewsResponse, RadarSourceStatus
from app.radar.rss_client import RssEntry
from app.radar.sources import SOURCES_BY_ID, RssSource


class FeedFetcher(Protocol):
    """Minimal boundary that keeps RSS retrieval testable without the network."""

    def fetch(self, source: RssSource) -> list[RssEntry]: ...


class RadarService:
    """Return source-attributed news while isolating each source failure."""

    def __init__(self, source_ids: tuple[str, ...], feed_fetcher: FeedFetcher) -> None:
        self._source_ids = source_ids
        self._feed_fetcher = feed_fetcher

    def get_news(self) -> RadarNewsResponse:
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

            try:
                entries = self._feed_fetcher.fetch(source)
            except Exception:
                statuses.append(
                    RadarSourceStatus(
                        source_id=source.source_id,
                        source_name=source.name,
                        status="error",
                        error_code="source_unavailable",
                        fetched_at=fetched_at,
                    )
                )
                continue

            statuses.append(
                RadarSourceStatus(
                    source_id=source.source_id,
                    source_name=source.name,
                    status="success",
                    fetched_at=fetched_at,
                )
            )
            items.extend(
                RadarNewsItem(
                    title=entry.title,
                    source_id=source.source_id,
                    source_name=source.name,
                    published_at=entry.published_at,
                    original_url=entry.original_url,
                    fetched_at=fetched_at,
                )
                for entry in entries
            )

        return RadarNewsResponse(
            items=sorted(
                items,
                key=lambda item: item.published_at or datetime.min.replace(tzinfo=UTC),
                reverse=True,
            ),
            sources=statuses,
            fetched_at=fetched_at,
        )
