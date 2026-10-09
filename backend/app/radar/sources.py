"""Closed registry of verified public RSS sources for the first Radar MVP."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RssSource:
    """An audited RSS endpoint; users never provide this URL at request time."""

    source_id: str
    name: str
    feed_url: str
    allowed_host: str


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
