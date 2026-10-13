"""Static, attributable examples for explicit visual demonstrations."""

from app.images.models import StockImage


class DemoImageSearchProvider:
    """Return a bounded catalog without calling an external search service.

    The catalog is intentionally static: it demonstrates MAREA's selection flow,
    not the relevance or availability of a live image-search provider.
    """

    provider_name = "demo"

    _catalog = (
        StockImage(
            identifier="demo-27986908",
            thumbnail_url="https://images.pexels.com/photos/27986908/pexels-photo-27986908.jpeg?auto=compress&cs=tinysrgb&w=640",
            display_url="https://images.pexels.com/photos/27986908/pexels-photo-27986908.jpeg?auto=compress&cs=tinysrgb&w=1280",
            author_name="Sami Abdullah",
            original_url="https://www.pexels.com/photo/a-man-taking-a-photo-of-the-water-with-his-camera-27986908/",
            provider="demo",
        ),
        StockImage(
            identifier="demo-30363421",
            thumbnail_url="https://images.pexels.com/photos/30363421/pexels-photo-30363421.jpeg?auto=compress&cs=tinysrgb&w=640",
            display_url="https://images.pexels.com/photos/30363421/pexels-photo-30363421.jpeg?auto=compress&cs=tinysrgb&w=1280",
            author_name="Du Tử Mộng",
            original_url="https://www.pexels.com/photo/woman-taking-a-photo-by-the-ocean-30363421/",
            provider="demo",
        ),
        StockImage(
            identifier="demo-28843908",
            thumbnail_url="https://images.pexels.com/photos/28843908/pexels-photo-28843908.jpeg?auto=compress&cs=tinysrgb&w=640",
            display_url="https://images.pexels.com/photos/28843908/pexels-photo-28843908.jpeg?auto=compress&cs=tinysrgb&w=1280",
            author_name="Asad Photo Maldives",
            original_url="https://www.pexels.com/photo/beachside-chef-preparing-fresh-pasta-at-sunset-28843908/",
            provider="demo",
        ),
    )

    def search(self, query: str, *, limit: int) -> list[StockImage]:
        """Keep the contract of a search provider while avoiding external calls."""

        del query
        return list(self._catalog[:limit])
