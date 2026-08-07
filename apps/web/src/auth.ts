import type { Env, Session } from './env';
import { HttpError } from './http';
import { constantTimeEqual } from './security';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_COOKIE = '__Host-cf_one_session';

export function assertSessionSecret(env: Env): void {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new HttpError(503, 'SESSION_SECRET must contain at least 32 characters');
  }
}

function base64url(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid base64url');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function cookie(request: Request, name: string): string | null {
  const source = request.headers.get('cookie') ?? '';
  for (const item of source.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return parts.join('=');
  }
  return null;
}

export async function deviceSignal(request: Request, env: Env): Promise<string> {
  assertSessionSecret(env);
  const parts = [
    request.headers.get('user-agent') ?? '',
    request.headers.get('sec-ch-ua') ?? '',
    request.headers.get('sec-ch-ua-platform') ?? '',
    request.headers.get('accept-language') ?? ''
  ].join('|');
  return (await hmac(env.SESSION_SECRET, `device:${parts}`)).slice(0, 22);
}

export interface SessionUser {
  id: string;
  email: string;
  role: 'member' | 'admin';
}

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function randomToken(length = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(length)));
}

async function credentialKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`cf-one:credential:${secret}`));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealVerifier(verifier: string, env: Env): Promise<string> {
  assertSessionSecret(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buffer(iv) }, await credentialKey(env.SESSION_SECRET), encoder.encode(verifier));
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

export async function openVerifier(box: string, env: Env): Promise<string | null> {
  assertSessionSecret(env);
  const [encodedIv, encodedCiphertext] = box.split('.');
  if (!encodedIv || !encodedCiphertext) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: buffer(fromBase64url(encodedIv)) },
      await credentialKey(env.SESSION_SECRET),
      buffer(fromBase64url(encodedCiphertext))
    );
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

export async function verifierProof(verifier: string, challenge: string): Promise<string> {
  const keyBytes = fromBase64url(verifier);
  const key = await crypto.subtle.importKey('raw', buffer(keyBytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(challenge))));
}

export async function issueSession(user: SessionUser, env: Env, request: Request): Promise<string> {
  assertSessionSecret(env);
  const payload: Session = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
    device: await deviceSignal(request, env),
    csrf: randomToken(24)
  };
  const encoded = base64url(encoder.encode(JSON.stringify(payload)));
  return `${encoded}.${await hmac(env.SESSION_SECRET, encoded)}`;
}

function validSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<Session>;
  return typeof session.sub === 'string' && session.sub.length >= 1 && session.sub.length <= 128 &&
    typeof session.email === 'string' && session.email.length >= 3 && session.email.length <= 254 &&
    (session.role === 'member' || session.role === 'admin') &&
    typeof session.exp === 'number' && Number.isSafeInteger(session.exp) &&
    typeof session.device === 'string' && /^[A-Za-z0-9_-]{22}$/.test(session.device) &&
    typeof session.csrf === 'string' && /^[A-Za-z0-9_-]{32}$/.test(session.csrf);
}

export async function readSession(request: Request, env: Env): Promise<Session | null> {
  assertSessionSecret(env);
  const token = cookie(request, SESSION_COOKIE);
  if (!token || token.length > 4096) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  const expected = await hmac(env.SESSION_SECRET, encoded);
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const parsed: unknown = JSON.parse(decoder.decode(fromBase64url(encoded)));
    if (!validSession(parsed) || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    parsed.deviceChanged = !constantTimeEqual(parsed.device, await deviceSignal(request, env));
    return parsed;
  } catch {
    return null;
  }
}

interface AuthorizationRow {
  role: 'member' | 'admin';
  username: string | null;
  display_name: string;
  account_status: 'active' | 'disabled';
  is_owner: number;
}

async function authorizeSession(session: Session, env: Env): Promise<Session | null> {
  const row = await env.DB.prepare(`SELECT role, username, display_name, account_status, is_owner
    FROM users WHERE id = ?1 AND lower(email) = lower(?2)`)
    .bind(session.sub, session.email).first<AuthorizationRow>();
  if (!row || row.account_status !== 'active') return null;
  session.role = row.is_owner ? 'admin' : row.role;
  session.owner = Boolean(row.is_owner);
  session.username = row.username ?? undefined;
  session.displayName = row.display_name;
  return session;
}

export async function currentSession(request: Request, env: Env): Promise<Session | null> {
  const session = await readSession(request, env);
  return session ? authorizeSession(session, env) : null;
}

export async function requireSession(request: Request, env: Env): Promise<Session> {
  const session = await currentSession(request, env);
  if (!session) throw new HttpError(401, 'authentication required');
  if (session.deviceChanged && env.DEVICE_BINDING === 'strict') throw new HttpError(401, 'device changed; sign in again');
  return session;
}

export function isOwner(session: Session): boolean {
  return Boolean(session.owner);
}

export function isCurrentAdmin(session: Session): boolean {
  return session.role === 'admin' || Boolean(session.owner);
}

export async function requireAdmin(request: Request, env: Env): Promise<Session> {
  const session = await requireSession(request, env);
  if (!isCurrentAdmin(session)) throw new HttpError(403, 'admin required');
  return session;
}

export async function requireOwner(request: Request, env: Env): Promise<Session> {
  const session = await requireSession(request, env);
  if (!isOwner(session)) throw new HttpError(403, 'owner required');
  return session;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600; Priority=High`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
