# CIE Math Content Folder

Place legally obtained CAIE Mathematics 9709 PDFs here:

- `raw/9709`: question papers, mark schemes, examiner reports, or specimen PDFs.
- `database`: generated manifests used by import tools.

Useful commands:

```bash
npm run cie:math:fetch-official
npm run cie:math:build-papacambridge
npm run cie:math:build-manifest
```

The official public fetch only downloads PDFs exposed on Cambridge International's public 9709 page. A complete five-year archive normally needs authorised School Support Hub access or PDFs supplied by the user/school.

The PapaCambridge builder creates the bundled frontend paper index at
`src/features/questionSearch/math9709PaperDatabase.ts`. It stores public QP/MS
links as metadata only; raw PDFs remain outside git and are opened or downloaded
by the user from the UI.
