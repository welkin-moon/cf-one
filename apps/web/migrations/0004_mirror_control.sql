PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS mirror_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  self_service_enabled INTEGER NOT NULL DEFAULT 1 CHECK (self_service_enabled IN (0, 1)),
  global_daily_request_limit INTEGER NOT NULL DEFAULT 5000 CHECK (global_daily_request_limit BETWEEN 100 AND 50000),
  global_daily_byte_limit INTEGER NOT NULL DEFAULT 2147483648 CHECK (global_daily_byte_limit BETWEEN 67108864 AND 21474836480),
  user_daily_request_limit INTEGER NOT NULL DEFAULT 200 CHECK (user_daily_request_limit BETWEEN 1 AND 5000),
  user_daily_byte_limit INTEGER NOT NULL DEFAULT 67108864 CHECK (user_daily_byte_limit BETWEEN 1048576 AND 1073741824),
  target_daily_request_limit INTEGER NOT NULL DEFAULT 500 CHECK (target_daily_request_limit BETWEEN 1 AND 10000),
  target_daily_byte_limit INTEGER NOT NULL DEFAULT 134217728 CHECK (target_daily_byte_limit BETWEEN 1048576 AND 2147483648),
  max_request_bytes INTEGER NOT NULL DEFAULT 262144 CHECK (max_request_bytes BETWEEN 16384 AND 2097152),
  max_response_bytes INTEGER NOT NULL DEFAULT 1048576 CHECK (max_response_bytes BETWEEN 65536 AND 10485760),
  self_service_limit INTEGER NOT NULL DEFAULT 1 CHECK (self_service_limit BETWEEN 0 AND 20),
  self_service_window_days INTEGER NOT NULL DEFAULT 30 CHECK (self_service_window_days BETWEEN 1 AND 365),
  active_target_limit INTEGER NOT NULL DEFAULT 2 CHECK (active_target_limit BETWEEN 1 AND 20),
  target_lifetime_hours INTEGER NOT NULL DEFAULT 168 CHECK (target_lifetime_hours BETWEEN 1 AND 720),
  warning_percent INTEGER NOT NULL DEFAULT 80 CHECK (warning_percent BETWEEN 50 AND 95),
  updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO mirror_policy (id) VALUES (1);

CREATE TABLE IF NOT EXISTS mirror_targets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  hostname TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  origin_host TEXT NOT NULL,
  label TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'active', 'suspended', 'rejected', 'expired')),
  auto_approved INTEGER NOT NULL DEFAULT 0 CHECK (auto_approved IN (0, 1)),
  decision_note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  approved_at INTEGER,
  expires_at INTEGER,
  last_access_at INTEGER,
  suspended_at INTEGER
);

CREATE TABLE IF NOT EXISTS mirror_trust_grants (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  auto_target_limit INTEGER,
  active_target_limit INTEGER,
  daily_request_limit INTEGER,
  daily_byte_limit INTEGER,
  expires_at INTEGER,
  note TEXT NOT NULL DEFAULT '',
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  granted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mirror_usage_windows (
  scope TEXT NOT NULL CHECK (scope IN ('global', 'user', 'target')),
  scope_id TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  response_bytes INTEGER NOT NULL DEFAULT 0 CHECK (response_bytes >= 0),
  reserved_bytes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, scope_id, window_start)
);

CREATE TABLE IF NOT EXISTS mirror_self_service_windows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  window_start INTEGER NOT NULL,
  activation_count INTEGER NOT NULL DEFAULT 0 CHECK (activation_count >= 0),
  PRIMARY KEY (user_id, window_start)
);
