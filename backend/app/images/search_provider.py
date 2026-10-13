"""Contracts and safe failures for stock-image search providers."""

from typing import Protocol, runtime_checkable

from app.images.models import StockImage


@runtime_checkable
class ImageSearchProvider(Protocol):
    """Search a configured provider without exposing its credentials."""

    provider_name: str

    def search(self, query: str, *, limit: int) -> list[StockImage]:
        """Return normalized candidates for one explicit query."""


class ImageSearchProviderError(RuntimeError):
    """Raised for upstream failures without retaining provider response details."""
