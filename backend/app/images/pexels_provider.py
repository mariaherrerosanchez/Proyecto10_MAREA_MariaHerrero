"""Pexels implementation of the stock-image search contract."""

from typing import Any
from urllib.parse import urlsplit

import httpx

from app.images.models import StockImage
from app.images.search_provider import ImageSearchProviderError

_PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"
_PEXELS_PAGE_HOSTS = {"pexels.com", "www.pexels.com"}
_PEXELS_IMAGE_HOST = "images.pexels.com"


class PexelsImageSearchProvider:
    """Use Pexels only through its fixed HTTPS API endpoint."""

    provider_name = "pexels"

    def __init__(
        self,
        api_key: str,
        *,
        timeout_seconds: float,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds
        self._transport = transport

    def search(self, query: str, *, limit: int) -> list[StockImage]:
        try:
            with httpx.Client(
                timeout=self._timeout_seconds,
                follow_redirects=False,
                transport=self._transport,
                headers={"Authorization": self._api_key},
            ) as client:
                response = client.get(
                    _PEXELS_SEARCH_URL,
                    params={"query": query, "per_page": limit},
                )
                response.raise_for_status()
                payload: Any = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ImageSearchProviderError("Pexels search did not complete.") from error

        if not isinstance(payload, dict) or not isinstance(payload.get("photos"), list):
            raise ImageSearchProviderError("Pexels returned an invalid search response.")

        images: list[StockImage] = []
        for photo in payload["photos"]:
            image = _normalize_photo(photo)
            if image is not None:
                images.append(image)
            if len(images) == limit:
                break
        return images


def _normalize_photo(photo: Any) -> StockImage | None:
    if not isinstance(photo, dict):
        return None

    identifier = photo.get("id")
    author_name = photo.get("photographer")
    original_url = photo.get("url")
    sources = photo.get("src")
    if (
        not isinstance(identifier, int | str)
        or not isinstance(author_name, str)
        or not author_name.strip()
        or not isinstance(original_url, str)
        or not isinstance(sources, dict)
    ):
        return None

    thumbnail_url = sources.get("medium")
    display_url = sources.get("large")
    if not all(isinstance(url, str) for url in (thumbnail_url, display_url)):
        return None
    if not _is_allowed_url(original_url, _PEXELS_PAGE_HOSTS):
        return None
    if not _is_allowed_url(thumbnail_url, {_PEXELS_IMAGE_HOST}):
        return None
    if not _is_allowed_url(display_url, {_PEXELS_IMAGE_HOST}):
        return None

    return StockImage(
        identifier=str(identifier),
        thumbnail_url=thumbnail_url,
        display_url=display_url,
        author_name=author_name.strip(),
        original_url=original_url,
        provider="pexels",
    )


def _is_allowed_url(value: str, allowed_hosts: set[str]) -> bool:
    parsed = urlsplit(value)
    return (
        parsed.scheme == "https"
        and parsed.hostname in allowed_hosts
        and parsed.port in (None, 443)
        and parsed.username is None
        and parsed.password is None
        and bool(parsed.path)
    )
