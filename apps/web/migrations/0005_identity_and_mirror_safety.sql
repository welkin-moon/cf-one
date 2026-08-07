PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_mirror_targets_host_state ON mirror_targets(hostname, state, expires_at);
CREATE INDEX IF NOT EXISTS idx_mirror_targets_owner_state ON mirror_targets(owner_id, state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mirror_trust_active ON mirror_trust_grants(enabled, expires_at);
CREATE INDEX IF NOT EXISTS idx_mirror_usage_window ON mirror_usage_windows(window_start, scope);

-- Keep a single canonical friendship pair even when concurrent requests are sent in opposite directions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_canonical_pair ON friendships (
  CASE WHEN requester_id < addressee_id THEN requester_id ELSE addressee_id END,
  CASE WHEN requester_id < addressee_id THEN addressee_id ELSE requester_id END
);
