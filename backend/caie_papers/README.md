# CAIE Past Paper Backend

This backend stores official public Cambridge International past-paper metadata and local PDF/page indexes in a normalized SQLite database.

## Scope

- Source: public Cambridge International subject pages only.
- Default range: 2018 and later.
- Included subjects: Chinese, Mathematics, English, Economics, Physics, Chemistry, Computer Science, Biology, and Business across IGCSE and AS/A Level where configured.
- The official public pages are a selected public subset. Cambridge notes that wider resources are available through School Support Hub for registered schools.

## Database Shape

The relational data is split into 3NF tables:

- `exam_boards`, `qualifications`, `subjects`, `syllabuses`
- `exam_series`, `paper_components`, `document_kinds`
- `paper_documents`, `document_pages`, `questions`
- `search_chunks` and `search_chunks_fts` for search indexing

`paper_documents.source_url` keeps the original official Cambridge URL, while `local_path` points to the downloaded PDF.

## Commands

```bash
python3 -m backend.caie_papers.cli init-db
python3 -m backend.caie_papers.cli fetch-official --dry-run
python3 -m backend.caie_papers.cli fetch-official
python3 -m backend.caie_papers.cli download-pending
python3 -m backend.caie_papers.cli index-pdfs
python3 -m backend.caie_papers.cli search "stationary point trigonometric"
python3 -m backend.caie_papers.cli serve --port 8765
```

Useful filters:

```bash
python3 -m backend.caie_papers.cli fetch-official --subject mathematics
python3 -m backend.caie_papers.cli fetch-official --qualification IGCSE
python3 -m backend.caie_papers.cli fetch-official --syllabus 9709
```

## OCR Search

The API supports local-image OCR search:

```bash
python3 -m backend.caie_papers.cli ocr-search /absolute/path/to/question.png
```

It uses Tesseract when available. If Tesseract is not on `PATH`, set:

```bash
export CAIE_TESSERACT=/absolute/path/to/tesseract
```

The indexed PDF text/page images do not require Tesseract when running with a Python environment that has `pdfplumber`. Page PNG rendering uses `pdftoppm` when available; this Codex runtime provides one under its bundled dependency path.

## HTTP API

- `GET /health`
- `GET /api/search?q=...&limit=10`
- `POST /api/search/ocr`

OCR request body:

```json
{
  "image_path": "/absolute/path/to/question.png",
  "languages": "eng+chi_sim",
  "limit": 10
}
```

Search results include `image_path`, `question_number`, `paper_number`, `paper_code`, `document_url`, and `local_pdf_path`.
