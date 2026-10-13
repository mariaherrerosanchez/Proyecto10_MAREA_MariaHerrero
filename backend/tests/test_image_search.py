"""Tests for Pexels image search without network access or real credentials."""

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.images import get_image_search_service
from app.core.config import Settings
from app.images.demo_provider import DemoImageSearchProvider
from app.images.models import StockImage, StockImageSearchResponse
from app.images.pexels_provider import PexelsImageSearchProvider
from app.images.search_provider import ImageSearchProviderError
from app.images.service import ImageSearchService
from app.main import create_app


def image(identifier: str = "1") -> StockImage:
    return StockImage(
        identifier=identifier,
        thumbnail_url=f"https://images.pexels.com/photos/{identifier}/thumbnail.jpeg",
        display_url=f"https://images.pexels.com/photos/{identifier}/display.jpeg",
        author_name="Ada Fotógrafa",
        original_url=f"https://www.pexels.com/photo/{identifier}/",
        provider="pexels",
    )


class StubImageSearchService:
    def __init__(self, items: list[StockImage] | None = None) -> None:
        self.items = items or [image()]
        self.queries: list[str] = []

    def search(self, query: str) -> StockImageSearchResponse:
        self.queries.append(query)
        return StockImageSearchResponse(items=self.items, provider="pexels")


class FailingImageSearchService:
    def search(self, query: str) -> StockImageSearchResponse:
        del query
        raise ImageSearchProviderError("upstream failure")


def test_pexels_provider_uses_fixed_endpoint_and_normalizes_safe_fields() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url).startswith("https://api.pexels.com/v1/search?")
        assert request.url.params["query"] == "fotografía de costa"
        assert request.url.params["per_page"] == "6"
        assert request.headers["Authorization"] == "private-test-key"
        return httpx.Response(200, json={
            "photos": [{
                "id": 42,
                "photographer": "Ada Fotógrafa",
                "url": "https://www.pexels.com/photo/42/",
                "src": {
                    "medium": "https://images.pexels.com/photos/42/medium.jpeg",
                    "large": "https://images.pexels.com/photos/42/large.jpeg",
                },
            }],
        })

    provider = PexelsImageSearchProvider(
        "private-test-key",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    assert provider.search("fotografía de costa", limit=6) == [
        StockImage(
            identifier="42",
            thumbnail_url="https://images.pexels.com/photos/42/medium.jpeg",
            display_url="https://images.pexels.com/photos/42/large.jpeg",
            author_name="Ada Fotógrafa",
            original_url="https://www.pexels.com/photo/42/",
            provider="pexels",
        )
    ]


def test_pexels_provider_rejects_invalid_upstream_payload_without_returning_urls() -> None:
    provider = PexelsImageSearchProvider(
        "private-test-key",
        timeout_seconds=1,
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"photos": "invalid"})),
    )

    with pytest.raises(ImageSearchProviderError):
        provider.search("consulta", limit=6)


def test_demo_provider_returns_a_bounded_attributable_catalog_without_network() -> None:
    provider = DemoImageSearchProvider()

    results = provider.search("veterinaria", limit=2)

    assert provider.provider_name == "demo"
    assert len(results) == 2
    assert all(result.provider == "demo" for result in results)
    assert all(str(result.original_url).startswith("https://www.pexels.com/") for result in results)


def test_demo_provider_is_used_only_when_explicitly_configured() -> None:
    application = create_app(Settings(IMAGE_SEARCH_PROVIDER="demo", _env_file=None))
    client = TestClient(application)

    response = client.get("/images/search", params={"query": "costa"})

    assert response.status_code == 200
    assert response.json()["provider"] == "demo"
    assert all(item["provider"] == "demo" for item in response.json()["items"])


def test_image_search_endpoint_validates_query_and_bounds_results() -> None:
    application = create_app(Settings(_env_file=None))
    service = StubImageSearchService([image(str(number)) for number in range(7)])
    application.dependency_overrides[get_image_search_service] = lambda: service
    client = TestClient(application)

    response = client.get("/images/search", params={"query": "  costa   mediterránea  "})

    assert response.status_code == 200
    assert response.json()["provider"] == "pexels"
    assert len(response.json()["items"]) == 6
    assert service.queries == ["costa mediterránea"]


@pytest.mark.parametrize("query", ["", "   ", "https://example.test", "www.example.test"])
def test_image_search_endpoint_rejects_blank_or_url_queries(query: str) -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_image_search_service] = StubImageSearchService
    client = TestClient(application)

    response = client.get("/images/search", params={"query": query})

    assert response.status_code == 422


def test_image_search_without_private_key_returns_only_a_safe_error() -> None:
    client = TestClient(create_app(Settings(_env_file=None)), raise_server_exceptions=False)

    response = client.get("/images/search", params={"query": "costa"})

    assert response.status_code == 503
    assert response.json() == {"detail": "La búsqueda de imágenes no está configurada ahora."}
    assert "api_key" not in response.text


def test_provider_failures_do_not_fall_back_to_demo_results() -> None:
    application = create_app(Settings(_env_file=None))
    application.dependency_overrides[get_image_search_service] = FailingImageSearchService
    client = TestClient(application, raise_server_exceptions=False)

    response = client.get("/images/search", params={"query": "costa"})

    assert response.status_code == 502
    assert response.json() == {
        "detail": "No se han podido buscar imágenes ahora. Inténtalo de nuevo.",
    }
