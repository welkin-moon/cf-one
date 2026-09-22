PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS invitation_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  code_prefix TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses >= 1 AND max_uses <= 10000),
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created ON invitation_codes(created_at DESC);

CREATE TABLE IF NOT EXISTS invitation_uses (
  id TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(invite_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_uses_invite ON invitation_uses(invite_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitation_uses_user ON invitation_uses(user_id, used_at DESC);
