"""Closed registry of verified public RSS sources for the first Radar MVP."""

from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode


SourceKind = Literal["verified_feed", "search_aggregator"]


@dataclass(frozen=True, slots=True)
class RssSource:
    """An audited RSS endpoint; users never provide this URL at request time."""

    source_id: str
    name: str
    feed_url: str
    allowed_host: str
    source_kind: SourceKind = "verified_feed"


SOURCES_BY_ID: dict[str, RssSource] = {
    "elpais-tecnologia": RssSource(
        source_id="elpais-tecnologia",
        name="EL PAÍS · Tecnología",
        feed_url="https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada",
        allowed_host="feeds.elpais.com",
    ),
    "elpais-ciencia": RssSource(
        source_id="elpais-ciencia",
        name="EL PAÍS · Ciencia",
        feed_url="https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ciencia/portada",
        allowed_host="feeds.elpais.com",
    ),
}


def google_news_source(topic: str, index: int) -> RssSource:
    """Create a bounded internal Google News RSS source for one validated topic."""

    query = urlencode(
        {
            "q": topic,
            "hl": "es",
            "gl": "ES",
            "ceid": "ES:es",
        }
    )
    return RssSource(
        source_id=f"google-news-{index}",
        name=f"Google News · {topic}",
        feed_url=f"https://news.google.com/rss/search?{query}",
        allowed_host="news.google.com",
        source_kind="search_aggregator",
    )
