import type { Env, Session } from './env';
import { HttpError } from './http';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64url(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
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
  const parts = [
    request.headers.get('user-agent') ?? '',
    request.headers.get('sec-ch-ua') ?? '',
    request.headers.get('sec-ch-ua-platform') ?? '',
    request.headers.get('accept-language') ?? ''
  ].join('|');
  return (await hmac(env.SESSION_SECRET, `device:${parts}`)).slice(0, 22);
}

export async function issueSession(email: string, env: Env, request: Request): Promise<string> {
  const admins = new Set(env.ADMIN_EMAILS.split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
  const payload: Session = {
    sub: crypto.randomUUID(),
    email,
    role: admins.has(email) ? 'admin' : 'member',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
    device: await deviceSignal(request, env)
  };
  const encoded = base64url(encoder.encode(JSON.stringify(payload)));
  return `${encoded}.${await hmac(env.SESSION_SECRET, encoded)}`;
}

export async function readSession(request: Request, env: Env): Promise<Session | null> {
  const token = cookie(request, 'cf_one_session');
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = await hmac(env.SESSION_SECRET, encoded);
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const session = JSON.parse(decoder.decode(fromBase64url(encoded))) as Session;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function requireSession(request: Request, env: Env): Promise<Session> {
  const session = await readSession(request, env);
  if (!session) throw new HttpError(401, 'authentication required');
  return session;
}

export async function requireAdmin(request: Request, env: Env): Promise<Session> {
  const session = await requireSession(request, env);
  if (session.role !== 'admin') throw new HttpError(403, 'admin required');
  return session;
}

export function sessionCookie(token: string): string {
  return `cf_one_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600`;
}

export function clearSessionCookie(): string {
  return 'cf_one_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}
