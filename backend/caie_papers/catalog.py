from __future__ import annotations

import sqlite3
from collections import defaultdict

from .config import MAINSTREAM_OCR_SYLLABUS_CODES


def list_subject_catalog(connection: sqlite3.Connection, *, mainstream_only: bool = True) -> list[dict[str, object]]:
    parameters: list[object] = []
    filter_sql = ""
    if mainstream_only:
        placeholders = ", ".join("?" for _ in MAINSTREAM_OCR_SYLLABUS_CODES)
        filter_sql = f"WHERE syl.code IN ({placeholders})"
        parameters.extend(sorted(MAINSTREAM_OCR_SYLLABUS_CODES))

    rows = connection.execute(
        f"""
        SELECT
          subj.id AS subject_id,
          subj.canonical_name,
          subj.display_name_zh,
          qual.id AS qualification_id,
          qual.code AS qualification_code,
          qual.name AS qualification_name,
          syl.id AS syllabus_id,
          syl.code AS syllabus_code,
          syl.name AS syllabus_name,
          syl.official_url,
          syl.active
        FROM syllabuses syl
        JOIN subjects subj ON subj.id = syl.subject_id
        JOIN qualifications qual ON qual.id = syl.qualification_id
        {filter_sql}
        ORDER BY subj.display_name_zh, subj.canonical_name, qual.code, syl.code
        """,
        parameters,
    ).fetchall()

    alias_rows = connection.execute(
        """
        SELECT subject_id, alias, language_code, alias_type
        FROM subject_aliases
        ORDER BY language_code, alias_type, alias
        """
    ).fetchall()
    aliases_by_subject: dict[int, list[dict[str, str]]] = defaultdict(list)
    for row in alias_rows:
        aliases_by_subject[int(row["subject_id"])].append(
            {
                "alias": str(row["alias"]),
                "language_code": str(row["language_code"]),
                "alias_type": str(row["alias_type"]),
            }
        )

    subjects: dict[int, dict[str, object]] = {}
    for row in rows:
        subject_id = int(row["subject_id"])
        subject = subjects.setdefault(
            subject_id,
            {
                "id": subject_id,
                "canonical_name": str(row["canonical_name"]),
                "display_name_zh": str(row["display_name_zh"]),
                "aliases": aliases_by_subject.get(subject_id, []),
                "syllabuses": [],
            },
        )
        syllabuses = subject["syllabuses"]
        assert isinstance(syllabuses, list)
        syllabuses.append(
            {
                "id": int(row["syllabus_id"]),
                "code": str(row["syllabus_code"]),
                "name": str(row["syllabus_name"]),
                "qualification": {
                    "id": int(row["qualification_id"]),
                    "code": str(row["qualification_code"]),
                    "name": str(row["qualification_name"]),
                },
                "official_url": str(row["official_url"]),
                "active": bool(row["active"]),
            }
        )

    return list(subjects.values())
