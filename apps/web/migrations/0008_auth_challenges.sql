PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('member', 'owner')),
  principal TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL CHECK (iterations BETWEEN 1 AND 1000000),
  challenge TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('login', 'register')),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_expiry ON auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_principal ON auth_challenges(kind, principal, expires_at);
