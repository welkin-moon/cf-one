import type { Env } from './env';

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function newInvitationCode(): string {
  return `LMS-${base64Url(crypto.getRandomValues(new Uint8Array(18)))}`;
}

export async function invitationCodeHash(code: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim())));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function consumeInvitationCode(env: Env, code: string, email?: string, requireBound = false): Promise<string | null> {
  const normalized = code.trim();
  if (!normalized || normalized.length > 160) return null;
  const hash = await invitationCodeHash(normalized);
  const normalizedEmail = email?.trim().toLowerCase() ?? '';
  const row = await env.DB.prepare(`UPDATE invitation_codes
    SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
    WHERE code_hash = ?1
      AND status = 'active'
      AND use_count < max_uses
      AND (expires_at IS NULL OR expires_at > unixepoch())
      AND (?2 = 0 OR bound_email IS NOT NULL)
      AND (bound_email IS NULL OR lower(bound_email) = ?3)
    RETURNING id`).bind(hash, requireBound ? 1 : 0, normalizedEmail).first<{ id: string }>();
  return row?.id ?? null;
}

export async function releaseInvitationCode(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`UPDATE invitation_codes
    SET use_count = CASE WHEN use_count > 0 THEN use_count - 1 ELSE 0 END
    WHERE id = ?1`).bind(id).run();
}
