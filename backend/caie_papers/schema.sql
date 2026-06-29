PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exam_boards (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qualifications (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  display_name_zh TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subject_aliases (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language_code TEXT NOT NULL CHECK (language_code IN ('zh', 'en')),
  alias_type TEXT NOT NULL DEFAULT 'search' CHECK (alias_type IN ('display', 'search')),
  UNIQUE (subject_id, alias, language_code)
);

CREATE TABLE IF NOT EXISTS syllabuses (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  qualification_id INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE RESTRICT,
  board_id INTEGER NOT NULL REFERENCES exam_boards(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  official_url TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (board_id, qualification_id, code)
);

CREATE TABLE IF NOT EXISTS document_kinds (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_series (
  id INTEGER PRIMARY KEY,
  year INTEGER NOT NULL,
  series_code TEXT NOT NULL,
  series_name TEXT NOT NULL,
  UNIQUE (year, series_code)
);

CREATE TABLE IF NOT EXISTS paper_components (
  id INTEGER PRIMARY KEY,
  syllabus_id INTEGER NOT NULL REFERENCES syllabuses(id) ON DELETE CASCADE,
  component_code TEXT NOT NULL,
  component_number TEXT,
  variant_code TEXT,
  component_name TEXT,
  UNIQUE (syllabus_id, component_code)
);

CREATE TABLE IF NOT EXISTS ingestion_batches (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS paper_documents (
  id INTEGER PRIMARY KEY,
  syllabus_id INTEGER NOT NULL REFERENCES syllabuses(id) ON DELETE CASCADE,
  exam_series_id INTEGER REFERENCES exam_series(id) ON DELETE SET NULL,
  component_id INTEGER REFERENCES paper_components(id) ON DELETE SET NULL,
  kind_id INTEGER NOT NULL REFERENCES document_kinds(id) ON DELETE RESTRICT,
  ingestion_batch_id INTEGER REFERENCES ingestion_batches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  local_path TEXT,
  checksum_sha256 TEXT,
  file_size_bytes INTEGER,
  downloaded_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_pages (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES paper_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text_content TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  image_checksum_sha256 TEXT,
  width_px INTEGER,
  height_px INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (document_id, page_number)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES paper_documents(id) ON DELETE CASCADE,
  page_id INTEGER REFERENCES document_pages(id) ON DELETE SET NULL,
  question_number TEXT NOT NULL,
  question_label TEXT,
  text_content TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (document_id, question_number, page_id)
);

CREATE TABLE IF NOT EXISTS search_chunks (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES paper_documents(id) ON DELETE CASCADE,
  page_id INTEGER REFERENCES document_pages(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('page', 'question')),
  body TEXT NOT NULL,
  image_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (chunk_type, page_id, question_id)
);

CREATE TABLE IF NOT EXISTS ocr_search_jobs (
  id INTEGER PRIMARY KEY,
  input_image_path TEXT NOT NULL,
  image_checksum_sha256 TEXT,
  languages TEXT NOT NULL DEFAULT 'eng+chi_sim',
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  qualification_id INTEGER REFERENCES qualifications(id) ON DELETE SET NULL,
  syllabus_id INTEGER REFERENCES syllabuses(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  ocr_text TEXT NOT NULL DEFAULT '',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS ocr_search_matches (
  id INTEGER PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES ocr_search_jobs(id) ON DELETE CASCADE,
  search_chunk_id INTEGER NOT NULL REFERENCES search_chunks(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  score REAL NOT NULL,
  matched_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (job_id, search_chunk_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_chunks_fts
USING fts5(body, chunk_id UNINDEXED, tokenize='unicode61');

DROP TRIGGER IF EXISTS search_chunks_ai;
DROP TRIGGER IF EXISTS search_chunks_ad;
DROP TRIGGER IF EXISTS search_chunks_au;

CREATE TRIGGER IF NOT EXISTS search_chunks_ai
AFTER INSERT ON search_chunks
BEGIN
  INSERT INTO search_chunks_fts(rowid, body, chunk_id)
  VALUES (new.id, new.body, new.id);
END;

CREATE TRIGGER IF NOT EXISTS search_chunks_ad
AFTER DELETE ON search_chunks
BEGIN
  DELETE FROM search_chunks_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS search_chunks_au
AFTER UPDATE ON search_chunks
BEGIN
  DELETE FROM search_chunks_fts WHERE rowid = old.id;
  INSERT INTO search_chunks_fts(rowid, body, chunk_id)
  VALUES (new.id, new.body, new.id);
END;

CREATE INDEX IF NOT EXISTS idx_syllabuses_subject ON syllabuses(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_aliases_subject ON subject_aliases(subject_id);
CREATE INDEX IF NOT EXISTS idx_documents_syllabus ON paper_documents(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_documents_component ON paper_documents(component_id);
CREATE INDEX IF NOT EXISTS idx_pages_document ON document_pages(document_id);
CREATE INDEX IF NOT EXISTS idx_questions_document ON questions(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON search_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_subject ON ocr_search_jobs(subject_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_syllabus ON ocr_search_jobs(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_ocr_matches_job ON ocr_search_matches(job_id);
