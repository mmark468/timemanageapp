from __future__ import annotations

import html
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

from .config import DEFAULT_SINCE_YEAR, OFFICIAL_HOSTS, SyllabusSource
from .models import DiscoveredResource, ResourceMetadata


SERIES_BY_TEXT = (
    ("february", "fm", "February/March"),
    ("march", "fm", "February/March"),
    ("feb", "fm", "February/March"),
    ("may", "mj", "May/June"),
    ("june", "mj", "May/June"),
    ("jun", "mj", "May/June"),
    ("october", "on", "October/November"),
    ("november", "on", "October/November"),
    ("oct", "on", "October/November"),
    ("nov", "on", "October/November"),
)

SERIES_BY_CAMBRIDGE_CODE = {
    "m": ("fm", "February/March"),
    "s": ("mj", "May/June"),
    "w": ("on", "October/November"),
}


class PdfLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._current_href: str | None = None
        self._current_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        attrs_dict = {key.lower(): value for key, value in attrs if value is not None}
        href = attrs_dict.get("href")
        if href and ".pdf" in href.lower():
            self._current_href = href
            self._current_text = []

    def handle_data(self, data: str) -> None:
        if self._current_href:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._current_href:
            return
        label = clean_text(" ".join(self._current_text))
        self.links.append((self._current_href, label))
        self._current_href = None
        self._current_text = []


def extract_pdf_resources(
    page_html: str,
    source: SyllabusSource,
    *,
    since_year: int = DEFAULT_SINCE_YEAR,
) -> list[DiscoveredResource]:
    parser = PdfLinkParser()
    parser.feed(page_html)

    resources: list[DiscoveredResource] = []
    seen_urls: set[str] = set()

    for href, label in parser.links:
        absolute_url = urljoin(source.official_url, href)
        if absolute_url in seen_urls or not is_allowed_official_pdf(absolute_url):
            continue

        metadata = parse_resource_metadata(label=label, url=absolute_url, source=source)
        if not is_past_paper_resource(metadata):
            continue
        if metadata.year is not None and metadata.year < since_year:
            continue

        seen_urls.add(absolute_url)
        resources.append(DiscoveredResource(source=source, metadata=metadata))

    return resources


def parse_resource_metadata(label: str, url: str, source: SyllabusSource) -> ResourceMetadata:
    file_name = Path(urlparse(url).path).name
    combined = clean_text(f"{label} {file_name}")
    lower = combined.lower()

    component_code = extract_component_code(combined, source.syllabus_code)
    component_name = f"Paper {component_code}" if component_code else None
    year = extract_year(combined)
    series_code, series_name = extract_series(combined)
    kind_code = extract_kind(lower)

    title = clean_text(label) or file_name
    return ResourceMetadata(
        title=title,
        source_url=url,
        file_name=file_name,
        kind_code=kind_code,
        year=year,
        series_code=series_code,
        series_name=series_name,
        component_code=component_code,
        component_name=component_name,
    )


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def is_allowed_official_pdf(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and parsed.hostname in OFFICIAL_HOSTS and parsed.path.lower().endswith(".pdf")


def is_past_paper_resource(metadata: ResourceMetadata) -> bool:
    return metadata.kind_code != "other"


def extract_kind(lower_text: str) -> str:
    is_specimen = "specimen" in lower_text
    if (
        "mark scheme" in lower_text
        or "mark-scheme" in lower_text
        or "markscheme" in lower_text
        or "_ms_" in lower_text
    ):
        return "specimen_mark_scheme" if is_specimen else "mark_scheme"
    if "question paper" in lower_text or "question-paper" in lower_text or "_qp_" in lower_text:
        return "specimen_question_paper" if is_specimen else "question_paper"
    if "specimen paper" in lower_text or "specimen-paper" in lower_text:
        return "specimen_question_paper"
    if "examiner report" in lower_text or "examiner-report" in lower_text or "_er_" in lower_text:
        return "examiner_report"
    if "grade threshold" in lower_text or "grade-threshold" in lower_text or "_gt_" in lower_text:
        return "grade_threshold"
    return "other"


def extract_year(text: str) -> int | None:
    full_year = re.search(r"\b(20\d{2})\b", text)
    if full_year:
        return int(full_year.group(1))

    short_year = re.search(r"(?:^|[_\-/ ])(?:m|s|w)(\d{2})(?:[_\-/ ]|$)", text.lower())
    if short_year:
        return int(f"20{short_year.group(1)}")
    return None


def extract_series(text: str) -> tuple[str | None, str | None]:
    lower = text.lower()
    for token, series_code, series_name in SERIES_BY_TEXT:
        if token in lower:
            return series_code, series_name

    encoded = re.search(r"(?:^|[_\-/ ])([msw])\d{2}(?:[_\-/ ]|$)", lower)
    if encoded:
        return SERIES_BY_CAMBRIDGE_CODE[encoded.group(1)]
    if "specimen" in lower:
        return "sp", "Specimen"
    return None, None


def extract_component_code(text: str, syllabus_code: str) -> str | None:
    lower = text.lower()

    paper_label = re.search(r"\bpaper\s*([0-9]{1,2})\b", lower)
    if paper_label:
        return normalise_component_code(paper_label.group(1))

    by_syllabus = re.search(
        rf"\b{re.escape(syllabus_code)}[_\-/](?:[msw]\d{{2}}[_\-/])?(?:qp|ms|er|gt)[_\-/]([0-9]{{1,2}})\b",
        lower,
    )
    if by_syllabus:
        return normalise_component_code(by_syllabus.group(1))

    generic = re.search(r"(?:^|[_\-/ ])(?:qp|ms|er|gt)[_\-/]([0-9]{1,2})(?:[_\-/ ]|$)", lower)
    if generic:
        return normalise_component_code(generic.group(1))

    return None


def normalise_component_code(component_code: str) -> str:
    cleaned = re.sub(r"\D", "", component_code)
    if not cleaned:
        return component_code
    return cleaned if len(cleaned) > 1 else f"{cleaned}1"
