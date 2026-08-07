PRAGMA foreign_keys = ON;

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_canonical_pair ON friendships (
  CASE WHEN requester_id < addressee_id THEN requester_id ELSE addressee_id END,
  CASE WHEN requester_id < addressee_id THEN addressee_id ELSE requester_id END
);
