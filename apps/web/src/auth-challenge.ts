import type { Env } from './env';
import { HttpError } from './http';

export type AuthChallengeKind = 'member' | 'owner';
export type AuthChallengeMode = 'login' | 'register';

export interface StoredAuthChallenge {
  id: string;
  kind: AuthChallengeKind;
  principal: string;
  salt: string;
  iterations: number;
  challenge: string;
  mode: AuthChallengeMode;
  expires_at: number;
}

interface NewAuthChallenge {
  id: string;
  kind: AuthChallengeKind;
  principal: string;
  salt: string;
  iterations: number;
  challenge: string;
  mode: AuthChallengeMode;
}

const CHALLENGE_TTL_SECONDS = 5 * 60;

export async function storeAuthChallenge(env: Env, input: NewAuthChallenge): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + CHALLENGE_TTL_SECONDS;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_challenges WHERE expires_at < ?1').bind(now),
    env.DB.prepare(`INSERT INTO auth_challenges
      (id, kind, principal, salt, iterations, challenge, mode, expires_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
      .bind(input.id, input.kind, input.principal, input.salt, input.iterations, input.challenge, input.mode, expiresAt)
  ]);
}

export async function consumeAuthChallenge(
  env: Env,
  id: string,
  kind: AuthChallengeKind,
  principal: string
): Promise<StoredAuthChallenge> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(`DELETE FROM auth_challenges
    WHERE id = ?1 AND kind = ?2 AND principal = ?3 AND expires_at >= ?4
    RETURNING id, kind, principal, salt, iterations, challenge, mode, expires_at`)
    .bind(id, kind, principal, now)
    .first<StoredAuthChallenge>();
  if (!row) throw new HttpError(403, 'login challenge expired or already used');
  return row;
}
