from __future__ import annotations

import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .config import DEFAULT_STORAGE_ROOT
from .db import upsert_page, upsert_search_chunk
from .ocr import extract_pdf_pages_text, render_pdf_pages


QUESTION_KIND_CODES = {"question_paper", "specimen_question_paper"}
ProgressCallback = Callable[[str], None]


@dataclass(frozen=True)
class IndexedDocument:
    document_id: int
    file_name: str
    page_count: int
    question_count: int
    rendered_page_count: int


def index_downloaded_documents(
    connection: sqlite3.Connection,
    *,
    storage_root: Path = DEFAULT_STORAGE_ROOT,
    include_non_question_documents: bool = False,
    render_pages: bool = True,
    limit: int | None = None,
    progress_callback: ProgressCallback | None = None,
) -> list[IndexedDocument]:
    rows = find_downloaded_documents(
        connection,
        include_non_question_documents=include_non_question_documents,
        limit=limit,
    )
    indexed: list[IndexedDocument] = []
    total = len(rows)
    for index, row in enumerate(rows, start=1):
        if progress_callback:
            progress_callback(f"[{index}/{total}] indexing {row['syllabus_code']} {row['file_name']}")
        indexed_document = index_document(connection, row, storage_root=storage_root, render_pages=render_pages)
        indexed.append(indexed_document)
        connection.commit()
        if progress_callback:
            progress_callback(
                f"[{index}/{total}] indexed {row['file_name']} "
                f"pages={indexed_document.page_count} questions={indexed_document.question_count}"
            )
    return indexed


def find_downloaded_documents(
    connection: sqlite3.Connection,
    *,
    include_non_question_documents: bool,
    limit: int | None,
) -> list[sqlite3.Row]:
    kind_filter = "" if include_non_question_documents else "AND dk.code IN ('question_paper', 'specimen_question_paper')"
    limit_sql = "" if limit is None else "LIMIT ?"
    params: tuple[int, ...] = () if limit is None else (limit,)
    return list(
        connection.execute(
            f"""
            SELECT
              pd.id,
              pd.file_name,
              pd.local_path,
              pd.source_url,
              s.code AS syllabus_code,
              q.code AS qualification_code,
              dk.code AS kind_code
            FROM paper_documents pd
            JOIN syllabuses s ON s.id = pd.syllabus_id
            JOIN qualifications q ON q.id = s.qualification_id
            JOIN document_kinds dk ON dk.id = pd.kind_id
            WHERE pd.local_path IS NOT NULL
              {kind_filter}
            ORDER BY q.code, s.code, pd.file_name
            {limit_sql}
            """,
            params,
        )
    )


def index_document(
    connection: sqlite3.Connection,
    row: sqlite3.Row,
    *,
    storage_root: Path = DEFAULT_STORAGE_ROOT,
    render_pages: bool,
) -> IndexedDocument:
    document_id = int(row["id"])
    pdf_path = Path(row["local_path"])
    if not pdf_path.exists():
        raise FileNotFoundError(f"Downloaded PDF missing: {pdf_path}")

    page_texts = extract_pdf_pages_text(pdf_path)
    rendered_pages = []
    if render_pages:
        page_image_dir = (
            storage_root
            / "page-images"
            / str(row["qualification_code"]).lower()
            / str(row["syllabus_code"])
            / pdf_path.stem
        )
        rendered_pages = render_pdf_pages(pdf_path, page_image_dir)
    rendered_by_page = {page.page_number: page for page in rendered_pages}

    question_count = 0
    for index, text in enumerate(page_texts, start=1):
        rendered = rendered_by_page.get(index)
        image_path = str(rendered.image_path) if rendered else None
        page_id = upsert_page(
            connection,
            document_id=document_id,
            page_number=index,
            text_content=text,
            image_path=image_path,
            image_checksum_sha256=rendered.checksum_sha256 if rendered else None,
            width_px=rendered.width_px if rendered else None,
            height_px=rendered.height_px if rendered else None,
        )
        question_count += upsert_question_chunks(
            connection,
            document_id=document_id,
            page_id=page_id,
            page_text=text,
            image_path=image_path,
        )

    return IndexedDocument(
        document_id=document_id,
        file_name=str(row["file_name"]),
        page_count=len(page_texts),
        question_count=question_count,
        rendered_page_count=len(rendered_pages),
    )


def upsert_question_chunks(
    connection: sqlite3.Connection,
    *,
    document_id: int,
    page_id: int,
    page_text: str,
    image_path: str | None,
) -> int:
    chunks = split_questions_from_page_text(page_text)
    count = 0
    for question_number, question_text in chunks:
        connection.execute(
            """
            INSERT INTO questions(document_id, page_id, question_number, question_label, text_content, image_path)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(document_id, question_number, page_id) DO UPDATE SET
              text_content = excluded.text_content,
              image_path = COALESCE(excluded.image_path, questions.image_path),
              updated_at = CURRENT_TIMESTAMP
            """,
            (document_id, page_id, question_number, f"Q{question_number}", question_text, image_path),
        )
        question_id = int(
            connection.execute(
                """
                SELECT id FROM questions
                WHERE document_id = ? AND question_number = ? AND page_id = ?
                """,
                (document_id, question_number, page_id),
            ).fetchone()["id"]
        )
        upsert_search_chunk(
            connection,
            document_id=document_id,
            page_id=None,
            question_id=question_id,
            chunk_type="question",
            body=question_text,
            image_path=image_path,
        )
        count += 1
    return count


def split_questions_from_page_text(page_text: str) -> list[tuple[str, str]]:
    normalized = "\n".join(line.rstrip() for line in page_text.splitlines())
    matches = list(re.finditer(r"(?m)^\s*(\d{1,2})(?:\s+|\(|$)", normalized))
    if not matches:
        return []

    chunks: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(normalized)
        question_number = match.group(1)
        question_text = normalized[start:end].strip()
        if len(question_text) >= 24:
            chunks.append((question_number, question_text))
    return chunks
