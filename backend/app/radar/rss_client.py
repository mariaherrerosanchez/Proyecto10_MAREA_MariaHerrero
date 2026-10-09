"""Bounded, redirect-free retrieval and parsing of trusted RSS feeds."""

from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from html import unescape
from urllib.parse import urlsplit
from xml.etree.ElementTree import Element

import httpx
from defusedxml import ElementTree

from app.radar.sources import RssSource

_ALLOWED_CONTENT_TYPES = {
    "application/atom+xml",
    "application/rss+xml",
    "application/xml",
    "text/xml",
}


class RssFeedError(ValueError):
    """Raised for feed failures without retaining upstream details for clients."""


@dataclass(frozen=True, slots=True)
class RssEntry:
    """Normalized metadata extracted from one RSS item."""

    title: str
    original_url: str
    published_at: datetime | None


class RssFeedClient:
    """Fetch only reviewed source URLs with explicit network and size limits."""

    def __init__(
        self,
        *,
        timeout_seconds: float,
        max_feed_bytes: int,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._timeout_seconds = timeout_seconds
        self._max_feed_bytes = max_feed_bytes
        self._transport = transport

    def fetch(self, source: RssSource) -> list[RssEntry]:
        """Return metadata only; article pages are never requested."""

        _validate_source_url(source)
        content = self._download(source.feed_url)
        return _parse_rss_entries(content)

    def _download(self, url: str) -> bytes:
        try:
            with httpx.Client(
                follow_redirects=False,
                timeout=self._timeout_seconds,
                transport=self._transport,
                headers={"Accept": "application/rss+xml, application/xml, text/xml"},
            ) as client:
                with client.stream("GET", url) as response:
                    if response.status_code != httpx.codes.OK:
                        raise RssFeedError("The RSS source did not return a successful response.")
                    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                    if content_type not in _ALLOWED_CONTENT_TYPES:
                        raise RssFeedError("The RSS source did not return XML content.")

                    chunks: list[bytes] = []
                    received = 0
                    for chunk in response.iter_bytes():
                        received += len(chunk)
                        if received > self._max_feed_bytes:
                            raise RssFeedError("The RSS source exceeded the configured size limit.")
                        chunks.append(chunk)
        except httpx.HTTPError as error:
            raise RssFeedError("The RSS source could not be reached.") from error

        return b"".join(chunks)


def _validate_source_url(source: RssSource) -> None:
    parsed = urlsplit(source.feed_url)
    if (
        parsed.scheme != "https"
        or parsed.hostname != source.allowed_host
        or parsed.port not in (None, 443)
        or parsed.username is not None
        or parsed.password is not None
        or not parsed.path
    ):
        raise RssFeedError("The RSS source URL is not permitted.")


def _parse_rss_entries(content: bytes) -> list[RssEntry]:
    try:
        root = ElementTree.fromstring(content)
    except ElementTree.ParseError as error:
        raise RssFeedError("The RSS source returned invalid XML.") from error

    entries: list[RssEntry] = []
    for item in root.iter():
        if _local_name(item.tag) != "item":
            continue
        title = _child_text(item, "title")
        original_url = _child_text(item, "link")
        if not title or not _is_safe_article_url(original_url):
            continue
        entries.append(
            RssEntry(
                title=_normalize_text(title),
                original_url=original_url.strip(),
                published_at=_parse_published_at(item),
            )
        )
    return entries


def _parse_published_at(item: Element) -> datetime | None:
    for name in ("pubdate", "published", "updated"):
        value = _child_text(item, name)
        if value is None:
            continue
        try:
            parsed = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                continue
        if parsed.tzinfo is not None:
            return parsed.astimezone(UTC)
    return None


def _child_text(item: Element, name: str) -> str | None:
    for child in item:
        if _local_name(child.tag) == name:
            return child.text
    return None


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _normalize_text(value: str) -> str:
    return " ".join(unescape(value).split())


def _is_safe_article_url(value: str | None) -> bool:
    if value is None:
        return False
    parsed = urlsplit(value.strip())
    return (
        parsed.scheme in {"http", "https"}
        and parsed.hostname is not None
        and parsed.username is None
        and parsed.password is None
    )
