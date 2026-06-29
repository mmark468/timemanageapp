# OCR Subject Catalog

This catalog seeds the CAIE OCR search backend with mainstream IGCSE and International AS & A Level subjects used by the app.

## 3NF Shape

- `exam_boards`: one row for CAIE.
- `qualifications`: `IGCSE` and `AS_A_LEVEL`.
- `subjects`: normalized subject concepts shown in the app.
- `subject_aliases`: Chinese names, English names, and common search aliases.
- `syllabuses`: official Cambridge syllabus codes and past-paper URLs.
- `paper_documents`, `document_pages`, `questions`, `search_chunks`: indexed paper content.
- `ocr_search_jobs`: one row per uploaded/selected OCR image.
- `ocr_search_matches`: ranked matches from one OCR job to indexed search chunks.

A2 is not stored as a separate qualification because Cambridge treats AS and A Level as one syllabus family. A2 filtering should be added later at the component/paper stage after component mappings are finalized for each syllabus.

## Mainstream OCR Subjects

| App subject | IGCSE syllabus | AS & A Level syllabus | Notes |
| --- | --- | --- | --- |
| 数学 | Mathematics 0580 | Mathematics 9709 | Core OCR math search route. |
| 高数 | Mathematics - Additional 0606 | Mathematics - Further 9231 | Grouped as `Further Mathematics` in app taxonomy. |
| 物理 | Physics 0625 | Physics 9702 | Science OCR route. |
| 计算机 | Computer Science 0478 | Computer Science 9618 | Code/algorithm questions need OCR cleanup later. |
| 经济 | Economics 0455 | Economics 9708 | Essay/data-response search route. |
| 化学 | Chemistry 0620 | Chemistry 9701 | Formula and structured-question OCR route. |
| 生物 | Biology 0610 | Biology 9700 | Diagram-heavy OCR route. |
| 心理 | Psychology 0266 | Psychology 9990 | Essay/data-response OCR route. |

## Official Cambridge URL Pattern

Every seeded syllabus points to:

```text
https://www.cambridgeinternational.org/programmes-and-qualifications/{syllabus-slug}/past-papers/
```

The downloader only accepts resources from official Cambridge hosts and records discovered PDFs into the normalized database.
