import type { Env } from './env';
import { assertSessionSecret, issueSession, readSession, sessionCookie, verifierProof } from './auth';
import { consumeAuthChallenge, storeAuthChallenge } from './auth-challenge';
import { HttpError, json, readJson } from './http';
import { constantTimeEqual, rateLimit } from './security';

const OWNER_ID = 'owner';
const OWNER_EMAIL = 'admin@owner.local';
const OWNER_USERNAME = 'admin';
// Cloudflare Workers WebCrypto rejects PBKDF2 iteration counts above 100,000.
// Keep the browser challenge and Worker verifier on the same supported value.
const OWNER_ITERATIONS = 100_000;
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
  if (!env.OWNER_PASSWORD) throw new HttpError(503, 'OWNER_PASSWORD is not configured');
  const material = await crypto.subtle.importKey('raw', encoder.encode(env.OWNER_PASSWORD), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: buffer(fromBase64url(salt)), iterations: OWNER_ITERATIONS },
    material,
    256
  );
  return base64url(new Uint8Array(bits));
}

async function ensureOwnerUser(env: Env): Promise<void> {
  await env.DB.prepare(`INSERT INTO users (id, email, display_name, role, status)
    VALUES (?1, ?2, ?3, 'admin', 'active')
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, role = 'admin', status = 'active'`)
    .bind(OWNER_ID, OWNER_EMAIL, OWNER_USERNAME).run();
}

export async function ownerAuthRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path === '/api/auth/challenge' && request.method === 'POST') {
    assertSessionSecret(env);
    const body = await readJson<{ email?: string }>(request);
    const username = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (username !== OWNER_USERNAME) return null;
    await rateLimit(request, env, 'owner-challenge', 12, 15 * 60);
    const salt = await ownerSalt(env);
    const challenge = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challengeId = base64url(crypto.getRandomValues(new Uint8Array(18)));
    await storeAuthChallenge(env, {
      id: challengeId,
      kind: 'owner',
      principal: OWNER_USERNAME,
      salt,
      iterations: OWNER_ITERATIONS,
      challenge,
      mode: 'login'
    });
    return json({ challengeId, challenge, salt, iterations: OWNER_ITERATIONS, mode: 'login' });
  }

  if (path === '/api/auth/login' && request.method === 'POST') {
    assertSessionSecret(env);
    const body = await readJson<{ email?: string; challengeId?: string; proof?: string }>(request);
    const username = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (username !== OWNER_USERNAME) return null;
    await rateLimit(request, env, 'owner-login', 8, 15 * 60);
    const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
    const proof = typeof body.proof === 'string' ? body.proof : '';
    if (!/^[A-Za-z0-9_-]{24}$/.test(challengeId) || !/^[A-Za-z0-9_-]{43}$/.test(proof)) {
      throw new HttpError(400, 'valid owner login challenge required');
    }
    const stored = await consumeAuthChallenge(env, challengeId, 'owner', OWNER_USERNAME);
    const verifier = await ownerVerifier(env, stored.salt);
    const expected = await verifierProof(verifier, stored.challenge);
    if (!constantTimeEqual(expected, proof)) throw new HttpError(403, 'invalid owner credentials');

    await ensureOwnerUser(env);
    const token = await issueSession({ id: OWNER_ID, email: OWNER_EMAIL, role: 'admin' }, env, request);
    const sessionRequest = new Request(request.url, {
      headers: {
        cookie: `__Host-cf_one_session=${token}`,
        'user-agent': request.headers.get('user-agent') ?? '',
        'accept-language': request.headers.get('accept-language') ?? '',
        'sec-ch-ua': request.headers.get('sec-ch-ua') ?? '',
        'sec-ch-ua-platform': request.headers.get('sec-ch-ua-platform') ?? ''
      }
    });
    const session = await readSession(sessionRequest, env);
    const response = json({
      ok: true,
      session: session ? {
        id: OWNER_ID,
        email: OWNER_USERNAME,
        role: 'admin',
        owner: true,
        expiresAt: new Date(session.exp * 1000).toISOString(),
        csrf: session.csrf,
        deviceChanged: false
      } : null
    });
    response.headers.set('set-cookie', sessionCookie(token));
    return response;
  }

  return null;
}
