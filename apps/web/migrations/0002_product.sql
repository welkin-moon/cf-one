PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN credential_salt TEXT;
ALTER TABLE users ADD COLUMN credential_box TEXT;
ALTER TABLE users ADD COLUMN credential_iterations INTEGER;
ALTER TABLE users ADD COLUMN last_login_at TEXT;

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS devices (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, device_hash)
);

CREATE INDEX IF NOT EXISTS idx_mail_recipient_received ON mail_messages(recipient, received_at DESC);
