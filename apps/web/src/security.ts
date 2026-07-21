import type { Env, Session } from './env';
import { HttpError } from './http';

export function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index++) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function requireSameOrigin(request: Request): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'same-origin request required');
}

export function requireCsrf(request: Request, session: Session): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const token = request.headers.get('x-csrf-token') ?? '';
  if (!constantTimeEqual(token, session.csrf)) throw new HttpError(403, 'invalid CSRF token');
}

export async function rateLimit(request: Request, env: Env, scope: string, limit: number, windowSeconds: number): Promise<void> {
  const address = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = `rate:${scope}:${address}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const current = Number(await env.CACHE.get(key)) || 0;
  if (current >= limit) throw new HttpError(429, 'too many requests');
  await env.CACHE.put(key, String(current + 1), { expirationTtl: Math.max(60, windowSeconds + 5) });
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] ?? character));
}
