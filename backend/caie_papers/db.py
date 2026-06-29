from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterator

from .config import DEFAULT_DB_PATH, DOCUMENT_KINDS, SUBJECT_ALIASES, SYLLABUS_SOURCES, SyllabusSource


SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def connect(db_path: Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def open_db(db_path: Path | str = DEFAULT_DB_PATH) -> Iterator[sqlite3.Connection]:
    connection = connect(db_path)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db(db_path: Path | str = DEFAULT_DB_PATH) -> None:
    with open_db(db_path) as connection:
        schema_sql = SCHEMA_PATH.read_text(encoding="utf8")
        connection.executescript(schema_sql)
        seed_static_data(connection)


def seed_static_data(connection: sqlite3.Connection) -> None:
    connection.execute(
        "INSERT OR IGNORE INTO exam_boards(code, name) VALUES (?, ?)",
        ("CAIE", "Cambridge Assessment International Education"),
    )

    for code, name in sorted({(source.qualification_code, source.qualification_name) for source in SYLLABUS_SOURCES}):
        connection.execute(
            "INSERT OR IGNORE INTO qualifications(code, name) VALUES (?, ?)",
            (code, name),
        )

    connection.execute("UPDATE syllabuses SET active = 0")

    for source in SYLLABUS_SOURCES:
        upsert_subject(connection, source.subject_name, source.subject_name_zh)
        upsert_syllabus(connection, source)

    seed_subject_aliases(connection)

    for code, name in DOCUMENT_KINDS.items():
        connection.execute(
            "INSERT OR IGNORE INTO document_kinds(code, name) VALUES (?, ?)",
            (code, name),
        )

    repair_document_kinds(connection)


def seed_subject_aliases(connection: sqlite3.Connection) -> None:
    for alias in SUBJECT_ALIASES:
        row = connection.execute(
            "SELECT id FROM subjects WHERE canonical_name = ?",
            (alias.canonical_name,),
        ).fetchone()
        if row is None:
            continue
        connection.execute(
            """
            INSERT INTO subject_aliases(subject_id, alias, language_code, alias_type)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(subject_id, alias, language_code) DO UPDATE SET
              alias_type = excluded.alias_type
            """,
            (row["id"], alias.alias, alias.language_code, alias.alias_type),
        )


def repair_document_kinds(connection: sqlite3.Connection) -> int:
    from .parsers import extract_kind

    rows = connection.execute("SELECT id, title, file_name FROM paper_documents").fetchall()
    repaired = 0
    for row in rows:
        kind_code = extract_kind(f"{row['title']} {row['file_name']}".lower())
        if kind_code == "other":
            continue
        kind_id = lookup_id(connection, "document_kinds", "code", kind_code)
        cursor = connection.execute(
            """
            UPDATE paper_documents
            SET kind_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND kind_id != ?
            """,
            (kind_id, row["id"], kind_id),
        )
        repaired += cursor.rowcount
    return repaired


def upsert_subject(connection: sqlite3.Connection, canonical_name: str, display_name_zh: str) -> int:
    connection.execute(
        """
        INSERT INTO subjects(canonical_name, display_name_zh)
        VALUES (?, ?)
        ON CONFLICT(canonical_name) DO UPDATE SET display_name_zh = excluded.display_name_zh
        """,
        (canonical_name, display_name_zh),
    )
    return int(
        connection.execute(
            "SELECT id FROM subjects WHERE canonical_name = ?",
            (canonical_name,),
        ).fetchone()["id"]
    )


def upsert_syllabus(connection: sqlite3.Connection, source: SyllabusSource) -> int:
    subject_id = upsert_subject(connection, source.subject_name, source.subject_name_zh)
    board_id = lookup_id(connection, "exam_boards", "code", "CAIE")
    qualification_id = lookup_id(connection, "qualifications", "code", source.qualification_code)

    connection.execute(
        """
        INSERT INTO syllabuses(subject_id, qualification_id, board_id, code, name, official_url, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(board_id, qualification_id, code) DO UPDATE SET
          subject_id = excluded.subject_id,
          name = excluded.name,
          official_url = excluded.official_url,
          active = excluded.active
        """,
        (subject_id, qualification_id, board_id, source.syllabus_code, source.syllabus_name, source.official_url),
    )
    return int(
        connection.execute(
            """
            SELECT id FROM syllabuses
            WHERE board_id = ? AND qualification_id = ? AND code = ?
            """,
            (board_id, qualification_id, source.syllabus_code),
        ).fetchone()["id"]
    )


def lookup_id(connection: sqlite3.Connection, table: str, key_column: str, key_value: str) -> int:
    row = connection.execute(
        f"SELECT id FROM {table} WHERE {key_column} = ?",
        (key_value,),
    ).fetchone()
    if row is None:
        raise LookupError(f"Missing {table}.{key_column}={key_value!r}")
    return int(row["id"])


def get_syllabus_id(connection: sqlite3.Connection, source: SyllabusSource) -> int:
    board_id = lookup_id(connection, "exam_boards", "code", "CAIE")
    qualification_id = lookup_id(connection, "qualifications", "code", source.qualification_code)
    row = connection.execute(
        """
        SELECT id FROM syllabuses
        WHERE board_id = ? AND qualification_id = ? AND code = ?
        """,
        (board_id, qualification_id, source.syllabus_code),
    ).fetchone()
    if row is None:
        return upsert_syllabus(connection, source)
    return int(row["id"])


def upsert_exam_series(
    connection: sqlite3.Connection,
    year: int | None,
    series_code: str | None,
    series_name: str | None,
) -> int | None:
    if year is None or not series_code or not series_name:
        return None

    connection.execute(
        """
        INSERT INTO exam_series(year, series_code, series_name)
        VALUES (?, ?, ?)
        ON CONFLICT(year, series_code) DO UPDATE SET series_name = excluded.series_name
        """,
        (year, series_code, series_name),
    )
    return int(
        connection.execute(
            "SELECT id FROM exam_series WHERE year = ? AND series_code = ?",
            (year, series_code),
        ).fetchone()["id"]
    )


def upsert_component(
    connection: sqlite3.Connection,
    syllabus_id: int,
    component_code: str | None,
    component_name: str | None,
) -> int | None:
    if not component_code:
        return None

    component_number = component_code[0] if component_code else None
    variant_code = component_code[1:] if len(component_code) > 1 else None
    connection.execute(
        """
        INSERT INTO paper_components(syllabus_id, component_code, component_number, variant_code, component_name)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(syllabus_id, component_code) DO UPDATE SET
          component_number = excluded.component_number,
          variant_code = excluded.variant_code,
          component_name = COALESCE(excluded.component_name, paper_components.component_name)
        """,
        (syllabus_id, component_code, component_number, variant_code, component_name),
    )
    return int(
        connection.execute(
            "SELECT id FROM paper_components WHERE syllabus_id = ? AND component_code = ?",
            (syllabus_id, component_code),
        ).fetchone()["id"]
    )


def start_ingestion_batch(connection: sqlite3.Connection, source: str, notes: str | None = None) -> int:
    cursor = connection.execute(
        """
        INSERT INTO ingestion_batches(source, started_at, status, notes)
        VALUES (?, ?, 'running', ?)
        """,
        (source, utc_now(), notes),
    )
    return int(cursor.lastrowid)


def complete_ingestion_batch(
    connection: sqlite3.Connection,
    batch_id: int,
    status: str = "completed",
    notes: str | None = None,
) -> None:
    connection.execute(
        """
        UPDATE ingestion_batches
        SET completed_at = ?, status = ?, notes = COALESCE(?, notes)
        WHERE id = ?
        """,
        (utc_now(), status, notes, batch_id),
    )


def upsert_document(
    connection: sqlite3.Connection,
    *,
    syllabus_id: int,
    kind_code: str,
    title: str,
    source_url: str,
    file_name: str,
    exam_series_id: int | None,
    component_id: int | None,
    ingestion_batch_id: int | None,
    local_path: str | None = None,
    checksum_sha256: str | None = None,
    file_size_bytes: int | None = None,
    downloaded_at: str | None = None,
) -> int:
    kind_id = lookup_id(connection, "document_kinds", "code", kind_code)
    connection.execute(
        """
        INSERT INTO paper_documents(
          syllabus_id, exam_series_id, component_id, kind_id, ingestion_batch_id,
          title, source_url, file_name, local_path, checksum_sha256, file_size_bytes, downloaded_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_url) DO UPDATE SET
          syllabus_id = excluded.syllabus_id,
          exam_series_id = excluded.exam_series_id,
          component_id = excluded.component_id,
          kind_id = excluded.kind_id,
          ingestion_batch_id = COALESCE(excluded.ingestion_batch_id, paper_documents.ingestion_batch_id),
          title = excluded.title,
          file_name = excluded.file_name,
          local_path = COALESCE(excluded.local_path, paper_documents.local_path),
          checksum_sha256 = COALESCE(excluded.checksum_sha256, paper_documents.checksum_sha256),
          file_size_bytes = COALESCE(excluded.file_size_bytes, paper_documents.file_size_bytes),
          downloaded_at = COALESCE(excluded.downloaded_at, paper_documents.downloaded_at),
          updated_at = CURRENT_TIMESTAMP
        """,
        (
            syllabus_id,
            exam_series_id,
            component_id,
            kind_id,
            ingestion_batch_id,
            title,
            source_url,
            file_name,
            local_path,
            checksum_sha256,
            file_size_bytes,
            downloaded_at,
        ),
    )
    return int(connection.execute("SELECT id FROM paper_documents WHERE source_url = ?", (source_url,)).fetchone()["id"])


def upsert_page(
    connection: sqlite3.Connection,
    *,
    document_id: int,
    page_number: int,
    text_content: str,
    image_path: str | None,
    image_checksum_sha256: str | None = None,
    width_px: int | None = None,
    height_px: int | None = None,
) -> int:
    connection.execute(
        """
        INSERT INTO document_pages(
          document_id, page_number, text_content, image_path, image_checksum_sha256, width_px, height_px
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(document_id, page_number) DO UPDATE SET
          text_content = excluded.text_content,
          image_path = COALESCE(excluded.image_path, document_pages.image_path),
          image_checksum_sha256 = COALESCE(excluded.image_checksum_sha256, document_pages.image_checksum_sha256),
          width_px = COALESCE(excluded.width_px, document_pages.width_px),
          height_px = COALESCE(excluded.height_px, document_pages.height_px),
          updated_at = CURRENT_TIMESTAMP
        """,
        (document_id, page_number, text_content, image_path, image_checksum_sha256, width_px, height_px),
    )
    page_id = int(
        connection.execute(
            "SELECT id FROM document_pages WHERE document_id = ? AND page_number = ?",
            (document_id, page_number),
        ).fetchone()["id"]
    )
    upsert_search_chunk(
        connection,
        document_id=document_id,
        page_id=page_id,
        question_id=None,
        chunk_type="page",
        body=text_content,
        image_path=image_path,
    )
    return page_id


def upsert_search_chunk(
    connection: sqlite3.Connection,
    *,
    document_id: int,
    page_id: int | None,
    question_id: int | None,
    chunk_type: str,
    body: str,
    image_path: str | None,
) -> int:
    if page_id is None and question_id is None:
        raise ValueError("A search chunk must reference either a page or a question.")

    existing = connection.execute(
        """
        SELECT id FROM search_chunks
        WHERE chunk_type = ?
          AND ((page_id IS NULL AND ? IS NULL) OR page_id = ?)
          AND ((question_id IS NULL AND ? IS NULL) OR question_id = ?)
        """,
        (chunk_type, page_id, page_id, question_id, question_id),
    ).fetchone()

    if existing:
        connection.execute(
            """
            UPDATE search_chunks
            SET document_id = ?, body = ?, image_path = COALESCE(?, image_path)
            WHERE id = ?
            """,
            (document_id, body, image_path, existing["id"]),
        )
        return int(existing["id"])

    cursor = connection.execute(
        """
        INSERT INTO search_chunks(document_id, page_id, question_id, chunk_type, body, image_path)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (document_id, page_id, question_id, chunk_type, body, image_path),
    )
    return int(cursor.lastrowid)


def create_ocr_search_job(
    connection: sqlite3.Connection,
    *,
    input_image_path: str,
    languages: str,
    image_checksum_sha256: str | None = None,
    subject_id: int | None = None,
    qualification_id: int | None = None,
    syllabus_id: int | None = None,
    status: str = "running",
) -> int:
    cursor = connection.execute(
        """
        INSERT INTO ocr_search_jobs(
          input_image_path, image_checksum_sha256, languages,
          subject_id, qualification_id, syllabus_id, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (input_image_path, image_checksum_sha256, languages, subject_id, qualification_id, syllabus_id, status),
    )
    return int(cursor.lastrowid)


def complete_ocr_search_job(
    connection: sqlite3.Connection,
    *,
    job_id: int,
    status: str,
    ocr_text: str = "",
    error_message: str | None = None,
) -> None:
    connection.execute(
        """
        UPDATE ocr_search_jobs
        SET status = ?,
            ocr_text = ?,
            error_message = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (status, ocr_text, error_message, job_id),
    )


def record_ocr_search_matches(
    connection: sqlite3.Connection,
    *,
    job_id: int,
    matches: list[tuple[int, float, str]],
) -> None:
    connection.execute("DELETE FROM ocr_search_matches WHERE job_id = ?", (job_id,))
    for index, (search_chunk_id, score, matched_text) in enumerate(matches, start=1):
        connection.execute(
            """
            INSERT INTO ocr_search_matches(job_id, search_chunk_id, rank, score, matched_text)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(job_id, search_chunk_id) DO UPDATE SET
              rank = excluded.rank,
              score = excluded.score,
              matched_text = excluded.matched_text
            """,
            (job_id, search_chunk_id, index, score, matched_text),
        )
