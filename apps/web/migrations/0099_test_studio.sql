PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('psychology', 'survey', 'quiz', 'poll')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  definition_json TEXT NOT NULL,
  result_json TEXT NOT NULL DEFAULT '[]',
  custom_js TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tests_owner_updated ON tests(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tests_status_published ON tests(status, published_at DESC);

CREATE TABLE IF NOT EXISTS test_visits (
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  started INTEGER NOT NULL DEFAULT 0 CHECK (started IN (0, 1)),
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  PRIMARY KEY (test_id, visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_test_visits_test_time ON test_visits(test_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS test_responses (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  result_key TEXT NOT NULL DEFAULT '',
  score REAL,
  submitted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_test_responses_test_time ON test_responses(test_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_responses_result ON test_responses(test_id, result_key);
