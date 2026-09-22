PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN session_epoch INTEGER NOT NULL DEFAULT 0 CHECK (session_epoch >= 0);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('registration_open', '1');

CREATE TABLE IF NOT EXISTS account_setup_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('setup', 'reset')),
  created_by TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_setup_tokens_user ON account_setup_tokens(user_id, expires_at DESC);
