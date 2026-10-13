"""Public, provider-neutral models for stock image search."""

from pydantic import BaseModel, ConfigDict, HttpUrl
from typing import Literal


ImageSearchProviderName = Literal["pexels", "demo"]


class StockImage(BaseModel):
    """A displayable stock-image candidate without provider credentials."""

    model_config = ConfigDict(extra="forbid")

    identifier: str
    thumbnail_url: HttpUrl
    display_url: HttpUrl
    author_name: str
    original_url: HttpUrl
    provider: ImageSearchProviderName


class StockImageSearchResponse(BaseModel):
    """The bounded result set returned after an explicit user search."""

    model_config = ConfigDict(extra="forbid")

    items: list[StockImage]
    provider: ImageSearchProviderName
