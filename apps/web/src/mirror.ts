import type { Env, MirrorTarget } from './env';
import { requireAdmin } from './auth';
import { HttpError } from './http';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);

function targets(env: Env): Record<string, MirrorTarget> {
  try { return JSON.parse(env.MIRROR_TARGETS || '{}') as Record<string, MirrorTarget>; }
  catch { throw new HttpError(500, 'invalid MIRROR_TARGETS JSON'); }
}

function validateTarget(value: MirrorTarget): URL {
  const url = new URL(value.origin);
  if (url.protocol !== 'https:') throw new HttpError(500, 'mirror origin must use HTTPS');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
    throw new HttpError(500, 'private-network mirror targets are blocked');
  }
  return url;
}

export async function mirrorRoute(request: Request, env: Env, path: string): Promise<Response | null> {
  const match = path.match(/^\/mirror\/([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (!match) return null;
  await requireAdmin(request, env);
  const alias = match[1];
  const config = targets(env)[alias];
  if (!config) throw new HttpError(404, 'unknown mirror target');
  const origin = validateTarget(config);
  const incoming = new URL(request.url);
  const target = new URL(`${match[2] ?? '/'}${incoming.search}`, origin);
  if (target.origin !== origin.origin) throw new HttpError(400, 'target escaped configured origin');

  const headers = new Headers(request.headers);
  headers.set('host', target.host);
  for (const name of HOP_BY_HOP) headers.delete(name);
  if (!config.allowCookies) {
    headers.delete('cookie');
    headers.delete('authorization');
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual'
  });
  const output = new Headers(upstream.headers);
  for (const name of HOP_BY_HOP) output.delete(name);
  if (!config.allowCookies) output.delete('set-cookie');
  const location = output.get('location');
  if (location) {
    const next = new URL(location, target);
    if (next.origin === origin.origin) output.set('location', `/mirror/${alias}${next.pathname}${next.search}${next.hash}`);
  }
  output.set('x-cf-one-mirror', alias);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: output });
}
