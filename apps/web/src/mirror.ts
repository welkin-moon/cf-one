import type { Env, MirrorTarget } from './env';
import { requireAdmin } from './auth';
import { HttpError } from './http';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
const SENSITIVE_REQUEST_HEADERS = ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'x-forwarded-for', 'x-real-ip'];

function targets(env: Env): Record<string, MirrorTarget> {
  try {
    const value = JSON.parse(env.MIRROR_TARGETS || '{}') as Record<string, MirrorTarget>;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    for (const [alias, target] of Object.entries(value)) {
      if (!/^[a-zA-Z0-9_-]{1,48}$/.test(alias) || !target || typeof target !== 'object' || typeof target.origin !== 'string') {
        throw new Error('invalid target');
      }
    }
    return value;
  } catch {
    throw new HttpError(500, 'invalid MIRROR_TARGETS JSON');
  }
}

function forbiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === 'lunarlab.uk' || host.endsWith('.lunarlab.uk') || host === '20100823.xyz' || host.endsWith('.20100823.xyz')) return true;
  if (host.includes(':')) return true;
  const parts = host.split('.').map(Number);
  if (parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const a = parts[0]!;
    const b = parts[1]!;
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return false;
}

function validateTarget(value: MirrorTarget): URL {
  let url: URL;
  try { url = new URL(value.origin); }
  catch { throw new HttpError(500, 'mirror origin is not a valid URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new HttpError(500, 'mirror origin must be a credential-free HTTPS origin without a path');
  }
  if (forbiddenHost(url.hostname)) throw new HttpError(500, 'private, local, and cf-one mirror targets are blocked');
  return url;
}

function base64url(value: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): string | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    return new TextDecoder().decode(Uint8Array.from(atob(padded), character => character.charCodeAt(0)));
  } catch {
    return null;
  }
}

function cookiePrefix(alias: string): string {
  return `cfm_${alias}_`;
}

function upstreamCookie(request: Request, alias: string): string | null {
  const prefix = cookiePrefix(alias);
  const result: string[] = [];
  for (const item of (request.headers.get('cookie') ?? '').split(';')) {
    const [name = '', ...value] = item.trim().split('=');
    if (!name.startsWith(prefix)) continue;
    const decoded = fromBase64url(name.slice(prefix.length));
    if (decoded && /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(decoded)) result.push(`${decoded}=${value.join('=')}`);
  }
  return result.length ? result.join('; ') : null;
}

function setCookies(headers: Headers): string[] {
  const modern = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof modern.getSetCookie === 'function') return modern.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function rewriteSetCookie(value: string, alias: string): string | null {
  const parts = value.split(';').map(part => part.trim());
  const [name, ...cookieValue] = (parts.shift() ?? '').split('=');
  if (!name || !cookieValue.length) return null;
  const attributes = parts.filter(part => !/^(domain|path)\s*=/i.test(part) && !/^partitioned$/i.test(part));
  const suffix = attributes.length ? `; ${attributes.join('; ')}` : '';
  return `${cookiePrefix(alias)}${base64url(name)}=${cookieValue.join('=')}; Path=/mirror/${alias}/${suffix}`;
}

function proxyUrl(value: string, target: URL, alias: string): string {
  if (!value || /^(?:data|blob|javascript|mailto|tel):/i.test(value)) return value;
  try {
    const resolved = new URL(value, target);
    return resolved.origin === target.origin ? `/mirror/${alias}${resolved.pathname}${resolved.search}${resolved.hash}` : value;
  } catch {
    return value;
  }
}

class AttributeRewriter {
  constructor(private attribute: string, private target: URL, private alias: string) {}
  element(element: Element): void {
    const value = element.getAttribute(this.attribute);
    if (value) element.setAttribute(this.attribute, proxyUrl(value, this.target, this.alias));
  }
}

function rewriteHtml(response: Response, target: URL, alias: string): Response {
  return new HTMLRewriter()
    .on('a[href]', new AttributeRewriter('href', target, alias))
    .on('area[href]', new AttributeRewriter('href', target, alias))
    .on('form[action]', new AttributeRewriter('action', target, alias))
    .on('link[href]', new AttributeRewriter('href', target, alias))
    .on('script[src]', new AttributeRewriter('src', target, alias))
    .on('img[src]', new AttributeRewriter('src', target, alias))
    .on('iframe[src]', new AttributeRewriter('src', target, alias))
    .on('source[src]', new AttributeRewriter('src', target, alias))
    .transform(response);
}

export async function mirrorRoute(request: Request, env: Env, path: string): Promise<Response | null> {
  const match = path.match(/^\/mirror\/([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (!match) return null;
  await requireAdmin(request, env);
  const alias = match[1]!;
  const config = targets(env)[alias];
  if (!config) throw new HttpError(404, 'unknown mirror target');
  const origin = validateTarget(config);
  const incoming = new URL(request.url);
  const target = new URL(`${match[2] ?? '/'}${incoming.search}`, origin);
  if (target.origin !== origin.origin) throw new HttpError(400, 'target escaped configured origin');
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) throw new HttpError(405, 'unsupported mirror method');

  const headers = new Headers(request.headers);
  headers.set('host', target.host);
  for (const name of HOP_BY_HOP) headers.delete(name);
  for (const name of [...SENSITIVE_REQUEST_HEADERS, 'cf-visitor', 'cdn-loop', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-user', 'sec-fetch-dest']) headers.delete(name);
  headers.delete('cookie');
  if (!config.allowAuthorization) headers.delete('authorization');
  if (config.allowCookies) {
    const translated = upstreamCookie(request, alias);
    if (translated) headers.set('cookie', translated);
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual'
  });
  const output = new Headers(upstream.headers);
  for (const name of HOP_BY_HOP) output.delete(name);
  output.delete('set-cookie');
  output.delete('content-security-policy');
  output.delete('content-security-policy-report-only');
  output.delete('clear-site-data');
  output.delete('service-worker-allowed');
  output.delete('content-length');
  if (config.allowCookies) {
    for (const upstreamValue of setCookies(upstream.headers)) {
      const translated = rewriteSetCookie(upstreamValue, alias);
      if (translated) output.append('set-cookie', translated);
    }
  }
  const location = output.get('location');
  if (location) output.set('location', proxyUrl(location, target, alias));
  output.set('cache-control', 'private, no-store');
  output.set('content-security-policy', "sandbox allow-forms allow-scripts allow-popups allow-downloads allow-top-navigation-by-user-activation; default-src 'self' data: blob: https:; img-src 'self' data: blob: https:; media-src 'self' blob: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: wss:; frame-ancestors 'none'");
  output.set('x-cf-one-mirror', alias);
  let response = new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: output });
  if (config.rewriteHtml !== false && output.get('content-type')?.toLowerCase().includes('text/html')) response = rewriteHtml(response, target, alias);
  return response;
}
