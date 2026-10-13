"""Application service for bounded, optional stock-image search."""

from app.images.models import StockImageSearchResponse
from app.images.search_provider import ImageSearchProvider


class ImageSearchService:
    """Keep one provider call isolated from generation and content state."""

    def __init__(self, provider: ImageSearchProvider) -> None:
        self._provider = provider

    def search(self, query: str) -> StockImageSearchResponse:
        return StockImageSearchResponse(
            items=self._provider.search(query, limit=6)[:6],
            provider=self._provider.provider_name,
        )
