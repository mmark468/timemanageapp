from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from backend.caie_papers.config import SYLLABUS_SOURCES
from backend.caie_papers.db import (
    complete_ocr_search_job,
    create_ocr_search_job,
    init_db,
    open_db,
    record_ocr_search_matches,
    upsert_page,
)
from backend.caie_papers.downloader import ingest_discovered_resources
from backend.caie_papers.models import DiscoveredResource, ResourceMetadata
from backend.caie_papers.parsers import extract_component_code, extract_kind, extract_pdf_resources, extract_series
from backend.caie_papers.search import search_text


class ParserTests(unittest.TestCase):
    def test_extracts_official_pdf_resources(self) -> None:
        source = next(item for item in SYLLABUS_SOURCES if item.syllabus_code == "9709")
        html = """
        <a href="/Images/567744-june-2024-question-paper-11.pdf">June 2024 Question Paper 11 (PDF)</a>
        <a href="https://example.com/not-official.pdf">Question Paper</a>
        <a href="/Images/old-2017-question-paper-11.pdf">June 2017 Question Paper 11</a>
        """
        resources = extract_pdf_resources(html, source, since_year=2018)
        self.assertEqual(len(resources), 1)
        metadata = resources[0].metadata
        self.assertEqual(metadata.year, 2024)
        self.assertEqual(metadata.series_code, "mj")
        self.assertEqual(metadata.component_code, "11")
        self.assertEqual(metadata.kind_code, "question_paper")

    def test_parses_common_cambridge_codes(self) -> None:
        self.assertEqual(extract_kind("9709_s24_ms_11.pdf"), "mark_scheme")
        self.assertEqual(extract_kind("635398-2024-specimen-paper-1-markscheme.pdf"), "specimen_mark_scheme")
        self.assertEqual(extract_series("9709_s24_qp_11.pdf"), ("mj", "May/June"))
        self.assertEqual(extract_component_code("9709_s24_qp_11.pdf", "9709"), "11")


class DatabaseSearchTests(unittest.TestCase):
    def test_mainstream_ocr_subject_catalog_is_seeded(self) -> None:
        expected_codes = {
            "0580",
            "0606",
            "0478",
            "0455",
            "0610",
            "0620",
            "0625",
            "0266",
            "9709",
            "9231",
            "9618",
            "9708",
            "9700",
            "9701",
            "9702",
            "9990",
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "papers.sqlite3"
            init_db(db_path)
            with open_db(db_path) as connection:
                rows = connection.execute(
                    """
                    SELECT syl.code, subj.display_name_zh, qual.code AS qualification_code
                    FROM syllabuses syl
                    JOIN subjects subj ON subj.id = syl.subject_id
                    JOIN qualifications qual ON qual.id = syl.qualification_id
                    WHERE syl.code IN ({})
                    """.format(", ".join("?" for _ in expected_codes)),
                    sorted(expected_codes),
                ).fetchall()
                alias_row = connection.execute(
                    """
                    SELECT subj.display_name_zh
                    FROM subject_aliases alias
                    JOIN subjects subj ON subj.id = alias.subject_id
                    WHERE alias.alias = ?
                    """,
                    ("高数",),
                ).fetchone()

        self.assertEqual({row["code"] for row in rows}, expected_codes)
        self.assertEqual(alias_row["display_name_zh"], "高数")

    def test_init_ingest_and_search(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "papers.sqlite3"
            init_db(db_path)
            source = next(item for item in SYLLABUS_SOURCES if item.syllabus_code == "9709")
            resource = DiscoveredResource(
                source=source,
                metadata=ResourceMetadata(
                    title="June 2024 Question Paper 11",
                    source_url="https://www.cambridgeinternational.org/Images/567744-june-2024-question-paper-11.pdf",
                    file_name="567744-june-2024-question-paper-11.pdf",
                    kind_code="question_paper",
                    year=2024,
                    series_code="mj",
                    series_name="May/June",
                    component_code="11",
                    component_name="Paper 11",
                ),
            )
            with open_db(db_path) as connection:
                ingest_discovered_resources(connection, [resource], batch_id=None)
                document_id = int(
                    connection.execute(
                        "SELECT id FROM paper_documents WHERE source_url = ?",
                        (resource.metadata.source_url,),
                    ).fetchone()["id"]
                )
                upsert_page(
                    connection,
                    document_id=document_id,
                    page_number=1,
                    text_content="Find the stationary point of a trigonometric curve.",
                    image_path="/tmp/page-001.png",
                )
                results = search_text(connection, "stationary trigonometric", limit=5)

            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].paper_number, "11")
            self.assertEqual(results[0].paper_code, "9709/11/M/J/24")
            self.assertGreater(results[0].chunk_id, 0)

    def test_ocr_job_framework_records_ranked_matches(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "papers.sqlite3"
            init_db(db_path)
            source = next(item for item in SYLLABUS_SOURCES if item.syllabus_code == "9709")
            resource = DiscoveredResource(
                source=source,
                metadata=ResourceMetadata(
                    title="June 2024 Question Paper 11",
                    source_url="https://www.cambridgeinternational.org/Images/567744-june-2024-question-paper-11.pdf",
                    file_name="567744-june-2024-question-paper-11.pdf",
                    kind_code="question_paper",
                    year=2024,
                    series_code="mj",
                    series_name="May/June",
                    component_code="11",
                    component_name="Paper 11",
                ),
            )
            with open_db(db_path) as connection:
                ingest_discovered_resources(connection, [resource], batch_id=None)
                document_id = int(
                    connection.execute(
                        "SELECT id FROM paper_documents WHERE source_url = ?",
                        (resource.metadata.source_url,),
                    ).fetchone()["id"]
                )
                upsert_page(
                    connection,
                    document_id=document_id,
                    page_number=1,
                    text_content="Find the stationary point of a trigonometric curve.",
                    image_path="/tmp/page-001.png",
                )
                results = search_text(connection, "stationary trigonometric", limit=5)
                job_id = create_ocr_search_job(
                    connection,
                    input_image_path="/tmp/question.png",
                    image_checksum_sha256="abc123",
                    languages="eng+chi_sim",
                )
                record_ocr_search_matches(
                    connection,
                    job_id=job_id,
                    matches=[(result.chunk_id, result.score, result.matched_text) for result in results],
                )
                complete_ocr_search_job(
                    connection,
                    job_id=job_id,
                    status="completed",
                    ocr_text="stationary trigonometric",
                )
                job = connection.execute("SELECT status, ocr_text FROM ocr_search_jobs WHERE id = ?", (job_id,)).fetchone()
                matches = connection.execute("SELECT rank FROM ocr_search_matches WHERE job_id = ?", (job_id,)).fetchall()

            self.assertEqual(job["status"], "completed")
            self.assertEqual(job["ocr_text"], "stationary trigonometric")
            self.assertEqual([row["rank"] for row in matches], [1])


if __name__ == "__main__":
    unittest.main()
