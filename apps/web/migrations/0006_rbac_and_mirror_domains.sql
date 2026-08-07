PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'));
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);

ALTER TABLE mirror_targets ADD COLUMN domain_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mirror_targets_domain_id ON mirror_targets(domain_id) WHERE domain_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS mirror_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_value INTEGER NOT NULL CHECK (next_value >= 1)
);
INSERT OR IGNORE INTO mirror_sequence (id, next_value) VALUES (1, 1);
