from __future__ import annotations

import hashlib
import shutil
import sqlite3
import subprocess
import time
from pathlib import Path
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from .config import DEFAULT_SINCE_YEAR, DEFAULT_STORAGE_ROOT, OFFICIAL_HOSTS, SYLLABUS_SOURCES, SyllabusSource
from .db import (
    complete_ingestion_batch,
    get_syllabus_id,
    start_ingestion_batch,
    upsert_component,
    upsert_document,
    upsert_exam_series,
    utc_now,
)
from .models import DiscoveredResource, DownloadedResource
from .parsers import extract_pdf_resources


USER_AGENT = "TimePlanningCAIEPaperIndexer/0.1 (+official-public-pages-only)"
ProgressCallback = Callable[[str], None]


class DownloadError(RuntimeError):
    pass


def discover_official_resources(
    sources: tuple[SyllabusSource, ...] = SYLLABUS_SOURCES,
    *,
    since_year: int = DEFAULT_SINCE_YEAR,
    delay_seconds: float = 0.5,
) -> tuple[list[DiscoveredResource], list[str]]:
    resources: list[DiscoveredResource] = []
    warnings: list[str] = []

    for source in sources:
        try:
            html = fetch_text(source.official_url)
        except DownloadError as error:
            warnings.append(f"{source.syllabus_code} {source.syllabus_name}: {error}")
            continue

        source_resources = extract_pdf_resources(html, source, since_year=since_year)
        if not source_resources:
            warnings.append(f"{source.syllabus_code} {source.syllabus_name}: no public PDF resources found")
        resources.extend(source_resources)
        if delay_seconds > 0:
            time.sleep(delay_seconds)

    return resources, warnings


def ingest_discovered_resources(
    connection: sqlite3.Connection,
    resources: list[DiscoveredResource],
    *,
    batch_id: int | None,
) -> int:
    inserted = 0
    for resource in resources:
        metadata = resource.metadata
        syllabus_id = get_syllabus_id(connection, resource.source)
        exam_series_id = upsert_exam_series(connection, metadata.year, metadata.series_code, metadata.series_name)
        component_id = upsert_component(
            connection,
            syllabus_id,
            metadata.component_code,
            metadata.component_name,
        )
        upsert_document(
            connection,
            syllabus_id=syllabus_id,
            kind_code=metadata.kind_code,
            title=metadata.title,
            source_url=metadata.source_url,
            file_name=metadata.file_name,
            exam_series_id=exam_series_id,
            component_id=component_id,
            ingestion_batch_id=batch_id,
        )
        inserted += 1
    return inserted


def download_and_ingest_official_resources(
    connection: sqlite3.Connection,
    *,
    sources: tuple[SyllabusSource, ...] = SYLLABUS_SOURCES,
    storage_root: Path = DEFAULT_STORAGE_ROOT,
    since_year: int = DEFAULT_SINCE_YEAR,
    dry_run: bool = False,
    delay_seconds: float = 0.5,
    progress_callback: ProgressCallback | None = None,
) -> tuple[list[DownloadedResource] | list[DiscoveredResource], list[str]]:
    batch_id = start_ingestion_batch(
        connection,
        "cambridge-official-public-pages",
        notes=f"since_year={since_year}; dry_run={dry_run}",
    )

    try:
        discovered, warnings = discover_official_resources(sources, since_year=since_year, delay_seconds=delay_seconds)
        ingest_discovered_resources(connection, discovered, batch_id=batch_id)
        if progress_callback:
            progress_callback(f"Discovered {len(discovered)} official public PDF resources.")

        if dry_run:
            complete_ingestion_batch(connection, batch_id, notes=f"discovered={len(discovered)}")
            return discovered, warnings

        downloaded: list[DownloadedResource] = []
        total = len(discovered)
        for index, resource in enumerate(discovered, start=1):
            destination = local_pdf_path(resource, storage_root=storage_root)
            existed = destination.exists()
            if progress_callback:
                verb = "checking" if existed else "downloading"
                progress_callback(f"[{index}/{total}] {verb} {resource.source.syllabus_code} {resource.metadata.file_name}")
            try:
                downloaded_resource = download_resource(resource, storage_root=storage_root)
            except DownloadError as error:
                warnings.append(f"{resource.source.syllabus_code} {resource.metadata.file_name}: {error}")
                if progress_callback:
                    progress_callback(f"[{index}/{total}] failed {resource.metadata.file_name}: {error}")
                continue
            else:
                update_downloaded_document(connection, downloaded_resource)
                downloaded.append(downloaded_resource)
                if progress_callback:
                    verb = "skipped" if existed else "saved"
                    progress_callback(f"[{index}/{total}] {verb} {resource.metadata.file_name}")
            if delay_seconds > 0:
                time.sleep(delay_seconds)

        status = "completed_with_warnings" if warnings else "completed"
        complete_ingestion_batch(connection, batch_id, status=status, notes=f"downloaded={len(downloaded)}")
        return downloaded, warnings
    except Exception as error:
        complete_ingestion_batch(connection, batch_id, status="failed", notes=str(error))
        raise


def download_resource(resource: DiscoveredResource, *, storage_root: Path = DEFAULT_STORAGE_ROOT) -> DownloadedResource:
    metadata = resource.metadata
    destination = local_pdf_path(resource, storage_root=storage_root)
    if destination.exists():
        return DownloadedResource(
            discovered=resource,
            local_path=str(destination),
            checksum_sha256=sha256_path(destination),
            file_size_bytes=destination.stat().st_size,
        )

    bytes_value = fetch_bytes(metadata.source_url)
    checksum = hashlib.sha256(bytes_value).hexdigest()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(bytes_value)

    return DownloadedResource(
        discovered=resource,
        local_path=str(destination),
        checksum_sha256=checksum,
        file_size_bytes=len(bytes_value),
    )


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def update_downloaded_document(connection: sqlite3.Connection, downloaded: DownloadedResource) -> int:
    resource = downloaded.discovered
    metadata = resource.metadata
    syllabus_id = get_syllabus_id(connection, resource.source)
    exam_series_id = upsert_exam_series(connection, metadata.year, metadata.series_code, metadata.series_name)
    component_id = upsert_component(
        connection,
        syllabus_id,
        metadata.component_code,
        metadata.component_name,
    )
    return upsert_document(
        connection,
        syllabus_id=syllabus_id,
        kind_code=metadata.kind_code,
        title=metadata.title,
        source_url=metadata.source_url,
        file_name=metadata.file_name,
        exam_series_id=exam_series_id,
        component_id=component_id,
        ingestion_batch_id=None,
        local_path=downloaded.local_path,
        checksum_sha256=downloaded.checksum_sha256,
        file_size_bytes=downloaded.file_size_bytes,
        downloaded_at=utc_now(),
    )


def download_pending_documents(
    connection: sqlite3.Connection,
    *,
    storage_root: Path = DEFAULT_STORAGE_ROOT,
    limit: int | None = None,
    progress_callback: ProgressCallback | None = None,
) -> tuple[int, list[str]]:
    rows = find_documents_for_download(connection, limit=limit)
    warnings: list[str] = []
    completed = 0
    total = len(rows)

    for index, row in enumerate(rows, start=1):
        destination = document_destination(row, storage_root=storage_root)
        existed = destination.exists()
        if progress_callback:
            verb = "checking" if existed else "downloading"
            progress_callback(f"[{index}/{total}] {verb} {row['syllabus_code']} {row['file_name']}")

        try:
            if not existed:
                bytes_value = fetch_bytes(str(row["source_url"]))
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(bytes_value)
            update_downloaded_document_row(connection, int(row["id"]), destination)
            connection.commit()
            completed += 1
        except DownloadError as error:
            warnings.append(f"{row['syllabus_code']} {row['file_name']}: {error}")
            if progress_callback:
                progress_callback(f"[{index}/{total}] failed {row['file_name']}: {error}")
            connection.commit()
            continue

        if progress_callback:
            verb = "registered" if existed else "saved"
            progress_callback(f"[{index}/{total}] {verb} {row['file_name']}")

    return completed, warnings


def find_documents_for_download(connection: sqlite3.Connection, *, limit: int | None = None) -> list[sqlite3.Row]:
    limit_sql = "" if limit is None else "LIMIT ?"
    params: tuple[int, ...] = () if limit is None else (limit,)
    return list(
        connection.execute(
            f"""
            SELECT
              pd.id,
              pd.source_url,
              pd.file_name,
              pd.local_path,
              syl.code AS syllabus_code,
              qual.code AS qualification_code,
              es.year,
              es.series_code
            FROM paper_documents pd
            JOIN syllabuses syl ON syl.id = pd.syllabus_id
            JOIN qualifications qual ON qual.id = syl.qualification_id
            LEFT JOIN exam_series es ON es.id = pd.exam_series_id
            ORDER BY qual.code, syl.code, es.year DESC, es.series_code, pd.file_name
            {limit_sql}
            """,
            params,
        )
    )


def document_destination(row: sqlite3.Row, *, storage_root: Path = DEFAULT_STORAGE_ROOT) -> Path:
    local_path = row["local_path"]
    if local_path and Path(str(local_path)).exists():
        return Path(str(local_path))

    year_folder = str(row["year"] or "unknown-year")
    series_folder = str(row["series_code"] or "unknown-series")
    safe_name = quote(str(row["file_name"]), safe="")
    return (
        storage_root
        / "raw"
        / str(row["qualification_code"]).lower()
        / str(row["syllabus_code"])
        / year_folder
        / series_folder
        / safe_name
    )


def update_downloaded_document_row(connection: sqlite3.Connection, document_id: int, destination: Path) -> None:
    connection.execute(
        """
        UPDATE paper_documents
        SET
          local_path = ?,
          checksum_sha256 = ?,
          file_size_bytes = ?,
          downloaded_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (str(destination), sha256_path(destination), destination.stat().st_size, utc_now(), document_id),
    )


def local_pdf_path(resource: DiscoveredResource, *, storage_root: Path = DEFAULT_STORAGE_ROOT) -> Path:
    metadata = resource.metadata
    year_folder = str(metadata.year or "unknown-year")
    series_folder = metadata.series_code or "unknown-series"
    safe_name = quote(metadata.file_name, safe="")
    return (
        storage_root
        / "raw"
        / resource.source.qualification_code.lower()
        / resource.source.syllabus_code
        / year_folder
        / series_folder
        / safe_name
    )


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf8", errors="replace")


def fetch_bytes(url: str) -> bytes:
    parsed = urlparse(url)
    if parsed.scheme not in {"https", "http"}:
        raise DownloadError(f"Unsupported URL scheme: {url}")
    if parsed.hostname not in OFFICIAL_HOSTS:
        raise DownloadError(f"Refusing non-official host: {url}")

    curl_error: DownloadError | None = None
    if shutil.which("curl"):
        try:
            return fetch_bytes_with_curl(url)
        except DownloadError as error:
            curl_error = error

    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=60) as response:
            status = getattr(response, "status", 200)
            if status >= 400:
                raise DownloadError(f"HTTP {status} for {url}")
            return response.read()
    except HTTPError as error:
        raise DownloadError(f"HTTP {error.code} for {url}") from error
    except URLError as error:
        if curl_error is not None:
            raise curl_error from error
        raise DownloadError(f"Network error for {url}: {error.reason}") from error


def fetch_bytes_with_curl(url: str) -> bytes:
    curl = shutil.which("curl")
    if not curl:
        raise DownloadError("curl is not available")

    try:
        result = subprocess.run(
            [
                curl,
                "--fail",
                "--location",
                "--silent",
                "--show-error",
                "--compressed",
                "--connect-timeout",
                "15",
                "--max-time",
                "90",
                "--speed-time",
                "30",
                "--speed-limit",
                "1024",
                "--retry",
                "2",
                "--retry-delay",
                "1",
                "--retry-all-errors",
                "--user-agent",
                USER_AGENT,
                url,
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except FileNotFoundError as error:
        raise DownloadError("curl is not available") from error
    except subprocess.CalledProcessError as error:
        stderr = error.stderr.decode("utf8", errors="replace").strip()
        message = stderr or f"curl exited with {error.returncode}"
        raise DownloadError(message) from error
    return result.stdout
