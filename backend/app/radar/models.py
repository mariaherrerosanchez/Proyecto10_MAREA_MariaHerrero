"""Public response models for external RSS news metadata."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, HttpUrl


class RadarNewsItem(BaseModel):
    """A source-attributed RSS headline; it is not generated content."""

    model_config = ConfigDict(extra="forbid")

    title: str
    source_id: str
    source_name: str
    published_at: datetime | None
    original_url: HttpUrl
    fetched_at: datetime


class RadarSourceStatus(BaseModel):
    """Safe per-source status that lets one failed feed not block others."""

    model_config = ConfigDict(extra="forbid")

    source_id: str
    source_name: str
    status: Literal["success", "error"]
    fetched_at: datetime
    error_code: Literal["source_unavailable", "source_configuration_invalid"] | None = None


class RadarNewsResponse(BaseModel):
    """Current external news signals and independent source outcomes."""

    model_config = ConfigDict(extra="forbid")

    items: list[RadarNewsItem]
    sources: list[RadarSourceStatus]
    fetched_at: datetime
