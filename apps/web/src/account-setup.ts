import type { Env } from './env';
import { randomToken } from './auth';

export function newAccountSetupToken(): string {
  return randomToken(32);
}

export async function accountSetupTokenHash(token: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token.trim())));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function findValidAccountSetupToken(env: Env, token: string, email: string): Promise<{ id: string; userId: string; kind: 'setup' | 'reset' } | null> {
  const normalized = token.trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(normalized)) return null;
  const hash = await accountSetupTokenHash(normalized);
  return env.DB.prepare(`SELECT t.id, t.user_id AS userId, t.kind
    FROM account_setup_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ?1 AND lower(u.email) = lower(?2)
      AND t.used_at IS NULL AND t.expires_at > unixepoch() AND u.deleted_at IS NULL`)
    .bind(hash, email).first<{ id: string; userId: string; kind: 'setup' | 'reset' }>();
}

export async function consumeAccountSetupToken(env: Env, token: string, userId: string): Promise<boolean> {
  const normalized = token.trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(normalized)) return false;
  const hash = await accountSetupTokenHash(normalized);
  const row = await env.DB.prepare(`UPDATE account_setup_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE token_hash = ?1 AND user_id = ?2 AND used_at IS NULL AND expires_at > unixepoch()
    RETURNING id`).bind(hash, userId).first<{ id: string }>();
  return Boolean(row);
}
