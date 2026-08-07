ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','disabled'));
ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0 CHECK (is_owner IN (0,1));
UPDATE users SET is_owner = 1, role = 'admin', account_status = 'active' WHERE lower(username) = 'admin';

CREATE TABLE IF NOT EXISTS mirror_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_value INTEGER NOT NULL CHECK (next_value >= 1)
);
INSERT OR IGNORE INTO mirror_sequence (id, next_value) VALUES (1, 1);

ALTER TABLE mirror_targets ADD COLUMN custom_domain_id TEXT;
ALTER TABLE mirror_targets ADD COLUMN provision_error TEXT NOT NULL DEFAULT '';
