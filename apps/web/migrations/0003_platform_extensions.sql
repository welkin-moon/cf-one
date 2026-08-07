PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS auth_factors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('passkey')),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_factors_user ON auth_factors(user_id, kind);

CREATE TABLE IF NOT EXISTS external_storage_connections (
  provider TEXT PRIMARY KEY CHECK (provider IN ('google-drive')),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_box TEXT NOT NULL,
  folder_id TEXT,
  scope TEXT,
  connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TEXT
);

CREATE TABLE IF NOT EXISTS stored_files (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google-drive', 'r2')),
  provider_file_id TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_file_id)
);
CREATE INDEX IF NOT EXISTS idx_stored_files_owner_created ON stored_files(owner_id, created_at DESC);
