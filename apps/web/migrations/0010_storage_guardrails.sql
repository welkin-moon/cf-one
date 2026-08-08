PRAGMA foreign_keys = ON;

ALTER TABLE storage_policy ADD COLUMN total_quota_bytes INTEGER NOT NULL DEFAULT 4398046511104 CHECK (total_quota_bytes >= 0 AND total_quota_bytes <= 5497558138880);
ALTER TABLE storage_policy ADD COLUMN provider_headroom_bytes INTEGER NOT NULL DEFAULT 53687091200 CHECK (provider_headroom_bytes >= 0 AND provider_headroom_bytes <= 1099511627776);
ALTER TABLE storage_policy ADD COLUMN default_daily_relay_bytes INTEGER NOT NULL DEFAULT 21474836480 CHECK (default_daily_relay_bytes >= 0 AND default_daily_relay_bytes <= 966367641600);
ALTER TABLE storage_policy ADD COLUMN total_daily_relay_bytes INTEGER NOT NULL DEFAULT 214748364800 CHECK (total_daily_relay_bytes >= 0 AND total_daily_relay_bytes <= 966367641600);
ALTER TABLE storage_policy ADD COLUMN default_daily_relay_requests INTEGER NOT NULL DEFAULT 5000 CHECK (default_daily_relay_requests >= 0 AND default_daily_relay_requests <= 1000000);
ALTER TABLE storage_policy ADD COLUMN total_daily_relay_requests INTEGER NOT NULL DEFAULT 50000 CHECK (total_daily_relay_requests >= 0 AND total_daily_relay_requests <= 1000000);
ALTER TABLE storage_policy ADD COLUMN default_file_count_limit INTEGER NOT NULL DEFAULT 5000 CHECK (default_file_count_limit >= 0 AND default_file_count_limit <= 1000000);
ALTER TABLE storage_policy ADD COLUMN total_file_count_limit INTEGER NOT NULL DEFAULT 50000 CHECK (total_file_count_limit >= 0 AND total_file_count_limit <= 1000000);

CREATE TABLE IF NOT EXISTS user_storage_transfer_limits (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_relay_bytes INTEGER NOT NULL CHECK (daily_relay_bytes >= 0 AND daily_relay_bytes <= 966367641600),
  daily_relay_requests INTEGER NOT NULL CHECK (daily_relay_requests >= 0 AND daily_relay_requests <= 1000000),
  updated_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS storage_traffic_daily (
  day TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upload_bytes INTEGER NOT NULL DEFAULT 0 CHECK (upload_bytes >= 0),
  download_bytes INTEGER NOT NULL DEFAULT 0 CHECK (download_bytes >= 0),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (day, user_id)
);
CREATE INDEX IF NOT EXISTS idx_storage_traffic_daily_day ON storage_traffic_daily(day);
