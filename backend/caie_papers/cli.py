from __future__ import annotations

import argparse
import json
from pathlib import Path

from .api import serve
from .catalog import list_subject_catalog
from .config import DEFAULT_DB_PATH, DEFAULT_SINCE_YEAR, DEFAULT_STORAGE_ROOT, SYLLABUS_SOURCES, SyllabusSource
from .db import init_db, open_db
from .downloader import download_and_ingest_official_resources, download_pending_documents
from .indexer import index_downloaded_documents
from .ocr import OCRUnavailable
from .search import search_image_ocr_with_job, search_text


def main() -> None:
    parser = argparse.ArgumentParser(description="CAIE past-paper database backend")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="SQLite database path")
    parser.add_argument("--storage-root", type=Path, default=DEFAULT_STORAGE_ROOT, help="Content storage root")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db", help="Create or update the 3NF SQLite database")

    fetch_parser = subparsers.add_parser("fetch-official", help="Discover/download official public Cambridge PDFs")
    fetch_parser.add_argument("--since-year", type=int, default=DEFAULT_SINCE_YEAR)
    fetch_parser.add_argument("--dry-run", action="store_true", help="Record discovered documents without downloading PDFs")
    fetch_parser.add_argument("--subject", action="append", help="Filter by subject key, e.g. mathematics")
    fetch_parser.add_argument("--qualification", action="append", help="Filter by qualification code, e.g. IGCSE")
    fetch_parser.add_argument("--syllabus", action="append", help="Filter by syllabus code, e.g. 9709")
    fetch_parser.add_argument("--delay", type=float, default=0.5, help="Delay between official requests")

    pending_parser = subparsers.add_parser(
        "download-pending",
        help="Download/register PDF rows already discovered in the database",
    )
    pending_parser.add_argument("--limit", type=int)

    index_parser = subparsers.add_parser("index-pdfs", help="Extract text, render page images, and index downloaded PDFs")
    index_parser.add_argument("--include-non-question-documents", action="store_true")
    index_parser.add_argument("--no-render", action="store_true", help="Skip page PNG rendering")
    index_parser.add_argument("--limit", type=int)

    search_parser = subparsers.add_parser("search", help="Search indexed question/page text")
    search_parser.add_argument("query")
    search_parser.add_argument("--limit", type=int, default=10)

    catalog_parser = subparsers.add_parser("catalog", help="Print the normalized subject/syllabus catalog")
    catalog_parser.add_argument("--all", action="store_true", help="Include non-mainstream seeded syllabuses")

    ocr_parser = subparsers.add_parser("ocr-search", help="OCR a local image and search indexed papers")
    ocr_parser.add_argument("image_path", type=Path)
    ocr_parser.add_argument("--languages", default="eng+chi_sim")
    ocr_parser.add_argument("--limit", type=int, default=10)

    serve_parser = subparsers.add_parser("serve", help="Start the local HTTP backend")
    serve_parser.add_argument("--host", default="127.0.0.1")
    serve_parser.add_argument("--port", type=int, default=8765)

    args = parser.parse_args()

    if args.command == "init-db":
        init_db(args.db)
        print(f"Database ready: {args.db}")
        return

    if args.command == "fetch-official":
        init_db(args.db)
        sources = filter_sources(
            subject_keys=args.subject,
            qualification_codes=args.qualification,
            syllabus_codes=args.syllabus,
        )
        with open_db(args.db) as connection:
            resources, warnings = download_and_ingest_official_resources(
                connection,
                sources=sources,
                storage_root=args.storage_root,
                since_year=args.since_year,
                dry_run=args.dry_run,
                delay_seconds=args.delay,
                progress_callback=print_flush,
            )
        print(json.dumps({"count": len(resources), "warnings": warnings}, ensure_ascii=False, indent=2))
        return

    if args.command == "index-pdfs":
        init_db(args.db)
        with open_db(args.db) as connection:
            indexed = index_downloaded_documents(
                connection,
                storage_root=args.storage_root,
                include_non_question_documents=args.include_non_question_documents,
                render_pages=not args.no_render,
                limit=args.limit,
                progress_callback=print_flush,
            )
        print(json.dumps([item.__dict__ for item in indexed], ensure_ascii=False, indent=2))
        return

    if args.command == "download-pending":
        init_db(args.db)
        with open_db(args.db) as connection:
            completed, warnings = download_pending_documents(
                connection,
                storage_root=args.storage_root,
                limit=args.limit,
                progress_callback=print_flush,
            )
        print(json.dumps({"count": completed, "warnings": warnings}, ensure_ascii=False, indent=2))
        return

    if args.command == "search":
        with open_db(args.db) as connection:
            results = [result.to_dict() for result in search_text(connection, args.query, limit=args.limit)]
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    if args.command == "catalog":
        init_db(args.db)
        with open_db(args.db) as connection:
            catalog = list_subject_catalog(connection, mainstream_only=not args.all)
        print(json.dumps(catalog, ensure_ascii=False, indent=2))
        return

    if args.command == "ocr-search":
        try:
            with open_db(args.db) as connection:
                job_id, text, results = search_image_ocr_with_job(
                    connection,
                    args.image_path,
                    languages=args.languages,
                    limit=args.limit,
                )
        except OCRUnavailable as error:
            raise SystemExit(str(error)) from error
        print(
            json.dumps(
                {"job_id": job_id, "ocr_text": text, "results": [result.to_dict() for result in results]},
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    if args.command == "serve":
        serve(args.db, host=args.host, port=args.port)
        return


def filter_sources(
    *,
    subject_keys: list[str] | None,
    qualification_codes: list[str] | None,
    syllabus_codes: list[str] | None,
) -> tuple[SyllabusSource, ...]:
    sources = SYLLABUS_SOURCES
    if subject_keys:
        allowed = {value.lower() for value in subject_keys}
        sources = tuple(source for source in sources if source.subject_key.lower() in allowed)
    if qualification_codes:
        allowed = {value.upper() for value in qualification_codes}
        sources = tuple(source for source in sources if source.qualification_code.upper() in allowed)
    if syllabus_codes:
        allowed = {value for value in syllabus_codes}
        sources = tuple(source for source in sources if source.syllabus_code in allowed)
    if not sources:
        raise SystemExit("No syllabus sources matched the requested filters.")
    return sources


def print_flush(message: str) -> None:
    print(message, flush=True)


if __name__ == "__main__":
    main()
