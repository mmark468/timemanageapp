from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STORAGE_ROOT = PROJECT_ROOT / "content" / "cambridge-past-papers"
DEFAULT_DB_PATH = DEFAULT_STORAGE_ROOT / "caie_papers.sqlite3"

OFFICIAL_HOSTS = {"www.cambridgeinternational.org", "cambridgeinternational.org"}
DEFAULT_SINCE_YEAR = 2018


@dataclass(frozen=True)
class SyllabusSource:
    subject_key: str
    subject_name: str
    subject_name_zh: str
    qualification_code: str
    qualification_name: str
    syllabus_code: str
    syllabus_name: str
    official_url: str


@dataclass(frozen=True)
class SubjectAliasSeed:
    canonical_name: str
    alias: str
    language_code: str
    alias_type: str = "search"


def past_papers_url(slug: str) -> str:
    return f"https://www.cambridgeinternational.org/programmes-and-qualifications/{slug}/past-papers/"


SYLLABUS_SOURCES: tuple[SyllabusSource, ...] = (
    # Cambridge IGCSE
    SyllabusSource("chinese", "Chinese First Language", "语文", "IGCSE", "Cambridge IGCSE", "0509", "Chinese - First Language", past_papers_url("cambridge-igcse-chinese-first-language-0509")),
    SyllabusSource("chinese", "Chinese Second Language", "语文", "IGCSE", "Cambridge IGCSE", "0523", "Chinese - Second Language", past_papers_url("cambridge-igcse-chinese-second-language-0523")),
    SyllabusSource("mathematics", "Mathematics", "数学", "IGCSE", "Cambridge IGCSE", "0580", "Mathematics", past_papers_url("cambridge-igcse-mathematics-0580")),
    SyllabusSource("further-mathematics", "Further Mathematics", "高数", "IGCSE", "Cambridge IGCSE", "0606", "Mathematics - Additional", past_papers_url("cambridge-igcse-mathematics-additional-0606")),
    SyllabusSource("english", "English First Language", "英语", "IGCSE", "Cambridge IGCSE", "0500", "English - First Language", past_papers_url("cambridge-igcse-english-first-language-0500")),
    SyllabusSource("english", "English as a Second Language", "英语", "IGCSE", "Cambridge IGCSE", "0510", "English as a Second Language (Speaking endorsement)", past_papers_url("cambridge-igcse-english-second-language-oral-endorsement-0510")),
    SyllabusSource("english", "English as a Second Language Count-in Speaking", "英语", "IGCSE", "Cambridge IGCSE", "0511", "English as a Second Language (Count-in speaking)", past_papers_url("cambridge-igcse-english-second-language-count-in-oral-0511")),
    SyllabusSource("economics", "Economics", "经济", "IGCSE", "Cambridge IGCSE", "0455", "Economics", past_papers_url("cambridge-igcse-economics-0455")),
    SyllabusSource("physics", "Physics", "物理", "IGCSE", "Cambridge IGCSE", "0625", "Physics", past_papers_url("cambridge-igcse-physics-0625")),
    SyllabusSource("chemistry", "Chemistry", "化学", "IGCSE", "Cambridge IGCSE", "0620", "Chemistry", past_papers_url("cambridge-igcse-chemistry-0620")),
    SyllabusSource("computer-science", "Computer Science", "计算机", "IGCSE", "Cambridge IGCSE", "0478", "Computer Science", past_papers_url("cambridge-igcse-computer-science-0478")),
    SyllabusSource("biology", "Biology", "生物", "IGCSE", "Cambridge IGCSE", "0610", "Biology", past_papers_url("cambridge-igcse-biology-0610")),
    SyllabusSource("psychology", "Psychology", "心理", "IGCSE", "Cambridge IGCSE", "0266", "Psychology", past_papers_url("cambridge-igcse-psychology-0266")),
    SyllabusSource("business", "Business Studies", "商务", "IGCSE", "Cambridge IGCSE", "0450", "Business Studies", past_papers_url("cambridge-igcse-business-studies-0450")),
    # Cambridge International AS & A Level
    SyllabusSource("chinese", "Chinese Language and Literature", "语文", "AS_A_LEVEL", "Cambridge International AS & A Level", "9868", "Chinese - Language & Literature", past_papers_url("cambridge-international-as-and-a-level-chinese-language-and-literature-9868")),
    SyllabusSource("chinese", "Chinese Language", "语文", "AS_A_LEVEL", "Cambridge International AS & A Level", "8238", "Chinese Language (AS Level only)", past_papers_url("cambridge-international-as-level-chinese-language-8238")),
    SyllabusSource("mathematics", "Mathematics", "数学", "AS_A_LEVEL", "Cambridge International AS & A Level", "9709", "Mathematics", past_papers_url("cambridge-international-as-and-a-level-mathematics-9709")),
    SyllabusSource("further-mathematics", "Further Mathematics", "高数", "AS_A_LEVEL", "Cambridge International AS & A Level", "9231", "Mathematics - Further", past_papers_url("cambridge-international-as-and-a-level-further-mathematics-9231")),
    SyllabusSource("english", "English Language", "英语", "AS_A_LEVEL", "Cambridge International AS & A Level", "9093", "English Language", past_papers_url("cambridge-international-as-and-a-level-english-language-9093")),
    SyllabusSource("economics", "Economics", "经济", "AS_A_LEVEL", "Cambridge International AS & A Level", "9708", "Economics", past_papers_url("cambridge-international-as-and-a-level-economics-9708")),
    SyllabusSource("physics", "Physics", "物理", "AS_A_LEVEL", "Cambridge International AS & A Level", "9702", "Physics", past_papers_url("cambridge-international-as-and-a-level-physics-9702")),
    SyllabusSource("chemistry", "Chemistry", "化学", "AS_A_LEVEL", "Cambridge International AS & A Level", "9701", "Chemistry", past_papers_url("cambridge-international-as-and-a-level-chemistry-9701")),
    SyllabusSource("computer-science", "Computer Science", "计算机", "AS_A_LEVEL", "Cambridge International AS & A Level", "9618", "Computer Science", past_papers_url("cambridge-international-as-and-a-level-computer-science-9618")),
    SyllabusSource("biology", "Biology", "生物", "AS_A_LEVEL", "Cambridge International AS & A Level", "9700", "Biology", past_papers_url("cambridge-international-as-and-a-level-biology-9700")),
    SyllabusSource("psychology", "Psychology", "心理", "AS_A_LEVEL", "Cambridge International AS & A Level", "9990", "Psychology", past_papers_url("cambridge-international-as-and-a-level-psychology-9990")),
    SyllabusSource("business", "Business", "商务", "AS_A_LEVEL", "Cambridge International AS & A Level", "9609", "Business", past_papers_url("cambridge-international-as-and-a-level-business-9609")),
)


MAINSTREAM_OCR_SYLLABUS_CODES = frozenset(
    {
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
)


SUBJECT_ALIASES: tuple[SubjectAliasSeed, ...] = (
    SubjectAliasSeed("Mathematics", "数学", "zh", "display"),
    SubjectAliasSeed("Mathematics", "普通数学", "zh"),
    SubjectAliasSeed("Mathematics", "math", "en"),
    SubjectAliasSeed("Mathematics", "maths", "en"),
    SubjectAliasSeed("Further Mathematics", "高数", "zh", "display"),
    SubjectAliasSeed("Further Mathematics", "进阶数学", "zh"),
    SubjectAliasSeed("Further Mathematics", "additional mathematics", "en"),
    SubjectAliasSeed("Further Mathematics", "further mathematics", "en"),
    SubjectAliasSeed("Further Mathematics", "add math", "en"),
    SubjectAliasSeed("Further Mathematics", "fm", "en"),
    SubjectAliasSeed("Physics", "物理", "zh", "display"),
    SubjectAliasSeed("Physics", "physics", "en"),
    SubjectAliasSeed("Computer Science", "计算机", "zh", "display"),
    SubjectAliasSeed("Computer Science", "电脑", "zh"),
    SubjectAliasSeed("Computer Science", "computer science", "en"),
    SubjectAliasSeed("Computer Science", "cs", "en"),
    SubjectAliasSeed("Economics", "经济", "zh", "display"),
    SubjectAliasSeed("Economics", "economics", "en"),
    SubjectAliasSeed("Chemistry", "化学", "zh", "display"),
    SubjectAliasSeed("Chemistry", "chemistry", "en"),
    SubjectAliasSeed("Biology", "生物", "zh", "display"),
    SubjectAliasSeed("Biology", "biology", "en"),
    SubjectAliasSeed("Psychology", "心理", "zh", "display"),
    SubjectAliasSeed("Psychology", "心理学", "zh"),
    SubjectAliasSeed("Psychology", "psychology", "en"),
)

DOCUMENT_KINDS = {
    "question_paper": "Question Paper",
    "mark_scheme": "Mark Scheme",
    "examiner_report": "Examiner Report",
    "grade_threshold": "Grade Threshold",
    "specimen_question_paper": "Specimen Question Paper",
    "specimen_mark_scheme": "Specimen Mark Scheme",
    "other": "Other",
}
