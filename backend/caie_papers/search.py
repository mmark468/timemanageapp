from __future__ import annotations

import re
import sqlite3
from dataclasses import asdict, dataclass
from pathlib import Path

from .ocr import ocr_image


@dataclass(frozen=True)
class SearchResult:
    chunk_id: int
    score: float
    chunk_type: str
    matched_text: str
    image_path: str | None
    question_number: str | None
    page_number: int | None
    paper_number: str | None
    paper_code: str
    document_title: str
    document_url: str
    local_pdf_path: str | None
    subject_name: str
    subject_name_zh: str
    syllabus_code: str
    qualification_code: str
    year: int | None
    series_name: str | None

    def to_dict(self) -> dict[str, object | None]:
        return asdict(self)


def search_text(connection: sqlite3.Connection, query: str, *, limit: int = 10) -> list[SearchResult]:
    query = query.strip()
    if not query:
        return []

    fts_query = build_fts_query(query)
    if fts_query:
        try:
            return search_fts(connection, fts_query, limit=limit)
        except sqlite3.OperationalError:
            pass

    return search_like(connection, query, limit=limit)


def search_image_ocr(
    connection: sqlite3.Connection,
    image_path: Path,
    *,
    languages: str = "eng+chi_sim",
    limit: int = 10,
) -> tuple[str, list[SearchResult]]:
    text = ocr_image(image_path, languages=languages)
    return text, search_text(connection, text, limit=limit)


def search_image_ocr_with_job(
    connection: sqlite3.Connection,
    image_path: Path,
    *,
    languages: str = "eng+chi_sim",
    limit: int = 10,
    subject_id: int | None = None,
    qualification_id: int | None = None,
    syllabus_id: int | None = None,
) -> tuple[int, str, list[SearchResult]]:
    from .db import complete_ocr_search_job, create_ocr_search_job, record_ocr_search_matches
    from .ocr import sha256_file

    checksum = sha256_file(image_path) if image_path.exists() else None
    job_id = create_ocr_search_job(
        connection,
        input_image_path=str(image_path),
        image_checksum_sha256=checksum,
        languages=languages,
        subject_id=subject_id,
        qualification_id=qualification_id,
        syllabus_id=syllabus_id,
    )
    try:
        text = ocr_image(image_path, languages=languages)
    except Exception as error:
        complete_ocr_search_job(connection, job_id=job_id, status="failed", error_message=str(error))
        raise

    results = search_text(connection, text, limit=limit)
    record_ocr_search_matches(
        connection,
        job_id=job_id,
        matches=[(result.chunk_id, result.score, result.matched_text) for result in results],
    )
    complete_ocr_search_job(connection, job_id=job_id, status="completed", ocr_text=text)
    return job_id, text, results


def search_fts(connection: sqlite3.Connection, fts_query: str, *, limit: int) -> list[SearchResult]:
    rows = connection.execute(
        """
        SELECT
          sc.id AS chunk_id,
          bm25(search_chunks_fts) * -1 AS score,
          sc.chunk_type,
          snippet(search_chunks_fts, 0, '', '', ' ... ', 28) AS matched_text,
          sc.image_path,
          qn.question_number,
          dp.page_number,
          pc.component_code,
          pd.title,
          pd.source_url,
          pd.local_path,
          subj.canonical_name AS subject_name,
          subj.display_name_zh AS subject_name_zh,
          syl.code AS syllabus_code,
          qual.code AS qualification_code,
          es.year,
          es.series_name
        FROM search_chunks_fts
        JOIN search_chunks sc ON sc.id = search_chunks_fts.chunk_id
        JOIN paper_documents pd ON pd.id = sc.document_id
        JOIN syllabuses syl ON syl.id = pd.syllabus_id
        JOIN subjects subj ON subj.id = syl.subject_id
        JOIN qualifications qual ON qual.id = syl.qualification_id
        JOIN document_kinds dk ON dk.id = pd.kind_id
        LEFT JOIN exam_series es ON es.id = pd.exam_series_id
        LEFT JOIN paper_components pc ON pc.id = pd.component_id
        LEFT JOIN document_pages dp ON dp.id = sc.page_id
        LEFT JOIN questions qn ON qn.id = sc.question_id
        WHERE search_chunks_fts MATCH ?
          AND dk.code IN ('question_paper', 'specimen_question_paper')
        ORDER BY bm25(search_chunks_fts), es.year DESC, pd.title
        LIMIT ?
        """,
        (fts_query, limit),
    ).fetchall()
    return [row_to_result(row) for row in rows]


def search_like(connection: sqlite3.Connection, query: str, *, limit: int) -> list[SearchResult]:
    like_query = f"%{query}%"
    rows = connection.execute(
        """
        SELECT
          sc.id AS chunk_id,
          1.0 AS score,
          sc.chunk_type,
          substr(sc.body, 1, 500) AS matched_text,
          sc.image_path,
          qn.question_number,
          dp.page_number,
          pc.component_code,
          pd.title,
          pd.source_url,
          pd.local_path,
          subj.canonical_name AS subject_name,
          subj.display_name_zh AS subject_name_zh,
          syl.code AS syllabus_code,
          qual.code AS qualification_code,
          es.year,
          es.series_name
        FROM search_chunks sc
        JOIN paper_documents pd ON pd.id = sc.document_id
        JOIN syllabuses syl ON syl.id = pd.syllabus_id
        JOIN subjects subj ON subj.id = syl.subject_id
        JOIN qualifications qual ON qual.id = syl.qualification_id
        JOIN document_kinds dk ON dk.id = pd.kind_id
        LEFT JOIN exam_series es ON es.id = pd.exam_series_id
        LEFT JOIN paper_components pc ON pc.id = pd.component_id
        LEFT JOIN document_pages dp ON dp.id = sc.page_id
        LEFT JOIN questions qn ON qn.id = sc.question_id
        WHERE sc.body LIKE ?
          AND dk.code IN ('question_paper', 'specimen_question_paper')
        ORDER BY es.year DESC, pd.title
        LIMIT ?
        """,
        (like_query, limit),
    ).fetchall()
    return [row_to_result(row) for row in rows]


def build_fts_query(query: str) -> str:
    terms = re.findall(r"[\w\u4e00-\u9fff]+", query.lower())
    filtered_terms = [term for term in terms if len(term) >= 2 and not term.isdigit()]
    if not filtered_terms:
        return ""
    unique_terms = list(dict.fromkeys(filtered_terms))[:12]
    return " OR ".join(quote_fts_term(term) for term in unique_terms)


def quote_fts_term(term: str) -> str:
    escaped = term.replace('"', '""')
    return f'"{escaped}"'


def row_to_result(row: sqlite3.Row) -> SearchResult:
    syllabus_code = str(row["syllabus_code"])
    component_code = row["component_code"]
    paper_code = build_paper_code(syllabus_code, component_code, row["series_name"], row["year"])
    return SearchResult(
        chunk_id=int(row["chunk_id"]),
        score=float(row["score"] or 0),
        chunk_type=str(row["chunk_type"]),
        matched_text=str(row["matched_text"] or ""),
        image_path=row["image_path"],
        question_number=row["question_number"],
        page_number=row["page_number"],
        paper_number=component_code,
        paper_code=paper_code,
        document_title=str(row["title"]),
        document_url=str(row["source_url"]),
        local_pdf_path=row["local_path"],
        subject_name=str(row["subject_name"]),
        subject_name_zh=str(row["subject_name_zh"]),
        syllabus_code=syllabus_code,
        qualification_code=str(row["qualification_code"]),
        year=row["year"],
        series_name=row["series_name"],
    )


def build_paper_code(
    syllabus_code: str,
    component_code: str | None,
    series_name: str | None,
    year: int | None,
) -> str:
    parts = [syllabus_code]
    if component_code:
        parts.append(str(component_code))
    if series_name:
        parts.append(series_short_code(series_name))
    if year:
        parts.append(str(year)[-2:])
    return "/".join(parts)


def series_short_code(series_name: str) -> str:
    lower = series_name.lower()
    if "feb" in lower or "march" in lower:
        return "F/M"
    if "may" in lower or "june" in lower:
        return "M/J"
    if "oct" in lower or "nov" in lower:
        return "O/N"
    if "specimen" in lower:
        return "SP"
    return series_name
