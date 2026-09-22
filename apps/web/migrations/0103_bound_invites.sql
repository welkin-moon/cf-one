PRAGMA foreign_keys = ON;

ALTER TABLE invitation_codes ADD COLUMN bound_email TEXT;
CREATE INDEX IF NOT EXISTS idx_invitation_codes_bound_email ON invitation_codes(bound_email);
