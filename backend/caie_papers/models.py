from __future__ import annotations

from dataclasses import dataclass

from .config import SyllabusSource


@dataclass(frozen=True)
class ResourceMetadata:
    title: str
    source_url: str
    file_name: str
    kind_code: str
    year: int | None
    series_code: str | None
    series_name: str | None
    component_code: str | None
    component_name: str | None


@dataclass(frozen=True)
class DiscoveredResource:
    source: SyllabusSource
    metadata: ResourceMetadata


@dataclass(frozen=True)
class DownloadedResource:
    discovered: DiscoveredResource
    local_path: str
    checksum_sha256: str
    file_size_bytes: int
