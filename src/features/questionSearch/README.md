# CIE Math Question Search

This folder keeps the question-search feature split into small pieces:

- `types.ts`: the shapes of the database, uploaded image signal, and search result.
- `cieMathQuestionBank.ts`: the current seed database for CAIE Mathematics 9709.
- `questionArchiveGateway.ts`: subject archive catalog, local download state, and the adapter boundary for future database-backed question packs.
- `textTools.ts`: text cleaning plus paper-code parsing such as `9709/11/M/J/24 Q3`.
- `imageFingerprint.ts`: a browser-only image hash for future exact/near image matching.
- `questionSearchEngine.ts`: scoring and sorting similar questions.
- `questionLocator.ts`: OCR/text orchestration that returns the most likely paper, question, answer, and candidates.

The UI page should import the search engine and data types from here, instead of putting database or matching logic inside the page component.
