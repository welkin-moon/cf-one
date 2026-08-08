PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS storage_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_quota_bytes INTEGER NOT NULL DEFAULT 10737418240 CHECK (default_quota_bytes >= 0 AND default_quota_bytes <= 5497558138880),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO storage_policy (id, default_quota_bytes) VALUES (1, 10737418240);

CREATE TABLE IF NOT EXISTS user_storage_quotas (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  quota_bytes INTEGER NOT NULL CHECK (quota_bytes >= 0 AND quota_bytes <= 5497558138880),
  updated_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS storage_provider_config (
  provider TEXT PRIMARY KEY CHECK (provider IN ('google-drive')),
  client_id TEXT NOT NULL,
  client_secret_box TEXT NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS storage_oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_storage_oauth_states_expiry ON storage_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS storage_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  total_bytes INTEGER NOT NULL CHECK (total_bytes > 0 AND total_bytes <= 5497558138880),
  received_bytes INTEGER NOT NULL DEFAULT 0 CHECK (received_bytes >= 0),
  session_box TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_storage_uploads_user_expiry ON storage_uploads(user_id, expires_at);
