import type { Env } from './env';
import { assertSessionSecret, currentSession, issueSession, sessionCookie, verifierProof } from './auth';
import { HttpError, json, readJson } from './http';
import { constantTimeEqual, rateLimit } from './security';

const OWNER_ITERATIONS = 310_000;
const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function ownerSalt(env: Env): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`cf-one-owner:${env.SESSION_SECRET}`));
  return base64url(new Uint8Array(digest).slice(0, 16));
}

async function ownerVerifier(env: Env, salt: string): Promise<string> {
  if (!env.OWNER_PASSWORD) throw new HttpError(503, 'OWNER_PASSWORD is not configured as a Worker secret');
  const material = await crypto.subtle.importKey('raw', encoder.encode(env.OWNER_PASSWORD), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: buffer(fromBase64url(salt)), iterations: OWNER_ITERATIONS },
    material,
    256
  );
  return base64url(new Uint8Array(bits));
}

function ownerName(env: Env): string {
  const value = (env.OWNER_USERNAME || 'admin').trim().toLowerCase();
  if (value !== 'admin') throw new HttpError(503, 'OWNER_USERNAME must remain admin');
  return value;
}

interface OwnerRow { id: string; email: string; display_name: string; }

async function ensureOwnerUser(env: Env): Promise<OwnerRow> {
  const username = ownerName(env);
  let user = await env.DB.prepare('SELECT id, email, display_name FROM users WHERE lower(username) = ?1 LIMIT 1')
    .bind(username).first<OwnerRow>();
  if (!user) {
    const id = 'owner';
    const email = 'admin@owner.local';
    await env.DB.prepare(`INSERT INTO users (id, email, display_name, role, username, account_status, is_owner)
      VALUES (?1, ?2, ?3, 'admin', ?4, 'active', 1)`)
      .bind(id, email, username, username).run();
    user = { id, email, display_name: username };
  } else {
    await env.DB.prepare(`UPDATE users SET role = 'admin', account_status = 'active', is_owner = 1 WHERE id = ?1`)
      .bind(user.id).run();
  }
  await env.DB.prepare(`UPDATE users SET is_owner = 0 WHERE id <> ?1 AND is_owner <> 0`).bind(user.id).run();
  return user;
}

export async function ownerAuthRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path === '/api/auth/challenge' && request.method === 'POST') {
    assertSessionSecret(env);
    const body = await readJson<{ email?: string }>(request);
    const username = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (username !== ownerName(env)) return null;
    await rateLimit(request, env, 'owner-challenge', 12, 15 * 60);
    const salt = await ownerSalt(env);
    const challenge = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challengeId = base64url(crypto.getRandomValues(new Uint8Array(18)));
    await env.CACHE.put(`owner:challenge:${challengeId}`, challenge, { expirationTtl: 300 });
    return json({ challengeId, challenge, salt, iterations: OWNER_ITERATIONS, mode: 'login' });
  }

  if (path === '/api/auth/login' && request.method === 'POST') {
    assertSessionSecret(env);
    const body = await readJson<{ email?: string; challengeId?: string; proof?: string }>(request);
    const username = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (username !== ownerName(env)) return null;
    await rateLimit(request, env, 'owner-login', 8, 15 * 60);
    const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
    const proof = typeof body.proof === 'string' ? body.proof : '';
    if (!/^[A-Za-z0-9_-]{24}$/.test(challengeId) || !/^[A-Za-z0-9_-]{43}$/.test(proof)) throw new HttpError(400, 'valid owner login challenge required');
    const key = `owner:challenge:${challengeId}`;
    const challenge = await env.CACHE.get(key);
    await env.CACHE.delete(key);
    if (!challenge) throw new HttpError(403, 'owner login challenge expired or already used');
    const verifier = await ownerVerifier(env, await ownerSalt(env));
    if (!constantTimeEqual(await verifierProof(verifier, challenge), proof)) throw new HttpError(403, 'invalid owner credentials');

    const owner = await ensureOwnerUser(env);
    const token = await issueSession({ id: owner.id, email: owner.email, role: 'admin' }, env, request);
    const sessionRequest = new Request(request.url, { headers: {
      cookie: `__Host-cf_one_session=${token}`,
      'user-agent': request.headers.get('user-agent') ?? '',
      'accept-language': request.headers.get('accept-language') ?? '',
      'sec-ch-ua': request.headers.get('sec-ch-ua') ?? '',
      'sec-ch-ua-platform': request.headers.get('sec-ch-ua-platform') ?? ''
    }});
    const session = await currentSession(sessionRequest, env);
    const response = json({ ok: true, session: session ? {
      id: session.sub,
      email: session.email,
      username: session.username ?? 'admin',
      displayName: session.displayName ?? owner.display_name,
      role: 'admin',
      owner: true,
      expiresAt: new Date(session.exp * 1000).toISOString(),
      csrf: session.csrf,
      deviceChanged: false
    } : null });
    response.headers.set('set-cookie', sessionCookie(token));
    return response;
  }

  return null;
}
