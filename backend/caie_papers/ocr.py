from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path


class OCRUnavailable(RuntimeError):
    pass


class PDFExtractionError(RuntimeError):
    pass


@dataclass(frozen=True)
class RenderedPage:
    page_number: int
    image_path: Path
    checksum_sha256: str
    width_px: int | None
    height_px: int | None


def extract_pdf_pages_text(pdf_path: Path) -> list[str]:
    pages = extract_pdf_pages_text_with_pdfplumber(pdf_path)
    if pages is not None:
        return pages

    pages = extract_pdf_pages_text_with_pdftotext(pdf_path)
    if pages is not None:
        return pages

    raise PDFExtractionError(
        "No PDF text extractor is available. Run with the bundled Python runtime that includes pdfplumber, "
        "or install Poppler's pdftotext."
    )


def extract_pdf_pages_text_with_pdfplumber(pdf_path: Path) -> list[str] | None:
    try:
        import pdfplumber  # type: ignore[import-not-found]
    except ModuleNotFoundError:
        return extract_pdf_pages_text_with_bundled_python(pdf_path)

    pages: list[str] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text(x_tolerance=1, y_tolerance=3) or "")
    return pages


def extract_pdf_pages_text_with_bundled_python(pdf_path: Path) -> list[str] | None:
    python = find_bundled_python()
    if not python:
        return None

    script = (
        "import json, pdfplumber, sys; "
        "pages=[]; "
        "pdf=pdfplumber.open(sys.argv[1]); "
        "[pages.append(page.extract_text(x_tolerance=1, y_tolerance=3) or '') for page in pdf.pages]; "
        "pdf.close(); "
        "print(json.dumps(pages))"
    )
    try:
        result = subprocess.run(
            [python, "-c", script, str(pdf_path)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return json.loads(result.stdout)


def extract_pdf_pages_text_with_pdftotext(pdf_path: Path) -> list[str] | None:
    pdftotext = find_binary("pdftotext", "CAIE_PDFTOTEXT")
    if not pdftotext:
        return None

    result = subprocess.run(
        [pdftotext, "-layout", str(pdf_path), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout.split("\f")


def render_pdf_pages(pdf_path: Path, output_dir: Path, *, dpi: int = 150) -> list[RenderedPage]:
    pdftoppm = find_binary("pdftoppm", "CAIE_PDFTOPPM")
    if not pdftoppm:
        return []

    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp_dir_name:
        prefix = Path(temp_dir_name) / "page"
        subprocess.run(
            [pdftoppm, "-png", "-r", str(dpi), str(pdf_path), str(prefix)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        rendered_pages: list[RenderedPage] = []
        for temp_image in sorted(Path(temp_dir_name).glob("page-*.png"), key=rendered_page_sort_key):
            page_number = parse_rendered_page_number(temp_image)
            destination = output_dir / f"page-{page_number:03d}.png"
            destination.write_bytes(temp_image.read_bytes())
            checksum = sha256_file(destination)
            width, height = image_dimensions(destination)
            rendered_pages.append(
                RenderedPage(
                    page_number=page_number,
                    image_path=destination,
                    checksum_sha256=checksum,
                    width_px=width,
                    height_px=height,
                )
            )
        return rendered_pages


def ocr_image(image_path: Path, *, languages: str = "eng+chi_sim") -> str:
    tesseract = find_binary("tesseract", "CAIE_TESSERACT")
    if not tesseract:
        raise OCRUnavailable(
            "No OCR engine is available. Install Tesseract and set CAIE_TESSERACT if it is not on PATH."
        )

    result = subprocess.run(
        [tesseract, str(image_path), "stdout", "-l", languages, "--psm", "6"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout.strip()


def find_binary(binary_name: str, env_var: str) -> str | None:
    configured = os.environ.get(env_var)
    if configured and Path(configured).exists():
        return configured

    from_path = shutil.which(binary_name)
    if from_path:
        return from_path

    bundled = Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies" / "bin" / binary_name
    if bundled.exists():
        return str(bundled)

    return None


def find_bundled_python() -> str | None:
    configured = os.environ.get("CAIE_PDFTEXT_PYTHON")
    if configured and Path(configured).exists():
        return configured

    bundled = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "python"
        / "bin"
        / "python3"
    )
    if bundled.exists():
        return str(bundled)
    return None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_dimensions(path: Path) -> tuple[int | None, int | None]:
    try:
        from PIL import Image  # type: ignore[import-not-found]
    except ModuleNotFoundError:
        return None, None

    with Image.open(path) as image:
        return int(image.width), int(image.height)


def rendered_page_sort_key(path: Path) -> int:
    return parse_rendered_page_number(path)


def parse_rendered_page_number(path: Path) -> int:
    stem = path.stem
    raw_number = stem.rsplit("-", 1)[-1]
    return int(raw_number)
