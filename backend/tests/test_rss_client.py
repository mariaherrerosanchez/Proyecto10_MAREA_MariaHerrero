"""Tests for bounded RSS retrieval and metadata normalization."""

from datetime import UTC, datetime

import httpx
import pytest

from app.radar.rss_client import RssFeedClient, RssFeedError
from app.radar.sources import RssSource, SOURCES_BY_ID


RSS_WITH_DATES = b"""<?xml version=\"1.0\"?>
<rss><channel>
  <item><title> IA &amp; sociedad </title><link>https://example.org/older</link>
  <pubDate>Wed, 08 Oct 2026 10:00:00 GMT</pubDate></item>
  <item><title>Sin fecha</title><link>https://example.org/undated</link></item>
</channel></rss>"""


def client_for(response: httpx.Response, *, max_feed_bytes: int = 1024) -> RssFeedClient:
    return RssFeedClient(
        timeout_seconds=1,
        max_feed_bytes=max_feed_bytes,
        transport=httpx.MockTransport(lambda _request: response),
    )


def test_fetch_normalizes_rss_metadata_without_inventing_missing_dates() -> None:
    entries = client_for(
        httpx.Response(200, headers={"content-type": "application/rss+xml"}, content=RSS_WITH_DATES)
    ).fetch(SOURCES_BY_ID["elpais-tecnologia"])

    assert [(entry.title, entry.original_url, entry.published_at) for entry in entries] == [
        ("IA & sociedad", "https://example.org/older", datetime(2026, 10, 8, 10, tzinfo=UTC)),
        ("Sin fecha", "https://example.org/undated", None),
    ]


@pytest.mark.parametrize(
    ("response", "expected_message"),
    [
        (httpx.Response(200, headers={"content-type": "text/html"}, content=b"<html />"), "XML"),
        (httpx.Response(200, headers={"content-type": "application/xml"}, content=b"<rss>"), "invalid XML"),
        (httpx.Response(302, headers={"location": "https://other.example/feed"}), "successful"),
    ],
)
def test_fetch_rejects_non_xml_invalid_xml_and_redirects(
    response: httpx.Response, expected_message: str
) -> None:
    with pytest.raises(RssFeedError, match=expected_message):
        client_for(response).fetch(SOURCES_BY_ID["elpais-tecnologia"])


def test_fetch_enforces_response_size_limit() -> None:
    response = httpx.Response(
        200,
        headers={"content-type": "application/xml"},
        content=b"x" * 33,
    )

    with pytest.raises(RssFeedError, match="size limit"):
        client_for(response, max_feed_bytes=32).fetch(SOURCES_BY_ID["elpais-tecnologia"])


def test_fetch_rejects_source_urls_outside_the_closed_https_registry() -> None:
    untrusted_source = RssSource(
        source_id="untrusted",
        name="Untrusted",
        feed_url="https://other.example/feed.xml",
        allowed_host="feeds.elpais.com",
    )

    with pytest.raises(RssFeedError, match="not permitted"):
        client_for(httpx.Response(200)).fetch(untrusted_source)
