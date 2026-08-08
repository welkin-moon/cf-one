import type { Env } from './env';
import { HttpError } from './http';

const RESOURCE_PREFIX = '/__cfone_origin__/';
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
const SENSITIVE_EDGE_HEADERS = ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'x-forwarded-for', 'x-real-ip', 'cf-visitor', 'cdn-loop'];
const MAX_REWRITE_BYTES = 6 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface MirrorRow {
  id: string;
  slug: string;
  hostname: string;
  origin: string;
  origin_host: string;
  state: 'active';
}

function base64url(value: string): string {
  let binary = '';
  for (const byte of encoder.encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): string {
  if (!/^[A-Za-z0-9_-]{8,512}$/.test(value)) throw new HttpError(400, 'invalid mirror resource origin');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  try {
    return decoder.decode(Uint8Array.from(atob(padded), character => character.charCodeAt(0)));
  } catch {
    throw new HttpError(400, 'invalid mirror resource origin');
  }
}

function sameOrSubdomain(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`);
}

function xFamily(host: string): boolean {
  return sameOrSubdomain(host, 'x.com') || sameOrSubdomain(host, 'twitter.com');
}

function allowedResourceHost(originHost: string, targetHost: string): boolean {
  const origin = originHost.toLowerCase();
  const target = targetHost.toLowerCase();
  if (target === origin) return true;
  if (xFamily(origin)) {
    return sameOrSubdomain(target, 'x.com') || sameOrSubdomain(target, 'twitter.com') ||
      sameOrSubdomain(target, 'twimg.com') || target === 't.co';
  }
  return false;
}

function cookiesMayFlow(originHost: string, targetHost: string): boolean {
  const origin = originHost.toLowerCase();
  const target = targetHost.toLowerCase();
  if (target === origin) return true;
  if (sameOrSubdomain(origin, 'x.com')) return sameOrSubdomain(target, 'x.com');
  if (sameOrSubdomain(origin, 'twitter.com')) return sameOrSubdomain(target, 'twitter.com');
  return false;
}

function validateStoredOrigin(value: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new HttpError(500, 'mirror origin is invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new HttpError(500, 'mirror origin is invalid');
  }
  return url;
}

function validateResourceOrigin(encoded: string, originHost: string): URL {
  let url: URL;
  try { url = new URL(fromBase64url(encoded)); }
  catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid mirror resource origin');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (url.port && url.port !== '443')) {
    throw new HttpError(400, 'invalid mirror resource origin');
  }
  if (!allowedResourceHost(originHost, url.hostname)) throw new HttpError(403, 'mirror resource host is not allowed');
  return url;
}

function resourceBase(targetOrigin: string, mirrorOrigin: string): string {
  return `${mirrorOrigin}${RESOURCE_PREFIX}${base64url(targetOrigin)}`;
}

function rewriteNavigation(value: string, upstream: URL, configuredOrigin: URL, mirrorOrigin: string): string {
  if (!value || /^(?:data|blob|javascript|mailto|tel):/i.test(value)) return value;
  try {
    const resolved = new URL(value, upstream);
    if (resolved.origin !== configuredOrigin.origin) return value;
    return `${mirrorOrigin}${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return value;
  }
}

function rewriteResource(value: string, upstream: URL, configuredOrigin: URL, mirrorOrigin: string): string {
  if (!value || /^(?:data|blob|javascript|mailto|tel):/i.test(value)) return value;
  try {
    const resolved = new URL(value, upstream);
    if (resolved.protocol !== 'https:') return value;
    if (resolved.origin === configuredOrigin.origin) return `${mirrorOrigin}${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!allowedResourceHost(configuredOrigin.hostname, resolved.hostname)) return value;
    return `${resourceBase(resolved.origin, mirrorOrigin)}${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return value;
  }
}

function rewriteAbsoluteOrigins(text: string, configuredOrigin: URL, mirrorOrigin: string): string {
  return text.replace(/https:\/\/[A-Za-z0-9.-]+(?::443)?/g, value => {
    try {
      const candidate = new URL(value);
      if (candidate.origin === configuredOrigin.origin) return mirrorOrigin;
      if (!allowedResourceHost(configuredOrigin.hostname, candidate.hostname)) return value;
      return resourceBase(candidate.origin, mirrorOrigin);
    } catch {
      return value;
    }
  });
}

function rewriteCss(text: string, upstream: URL, configuredOrigin: URL, mirrorOrigin: string): string {
  const absolute = rewriteAbsoluteOrigins(text, configuredOrigin, mirrorOrigin);
  return absolute
    .replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi, (match, quote: string, value: string) => {
      const rewritten = rewriteResource(value.trim(), upstream, configuredOrigin, mirrorOrigin);
      return rewritten === value.trim() ? match : `url(${quote}${rewritten}${quote})`;
    })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (match, quote: string, value: string) => {
      const rewritten = rewriteResource(value, upstream, configuredOrigin, mirrorOrigin);
      return rewritten === value ? match : `@import ${quote}${rewritten}${quote}`;
    });
}

function rewriteSrcset(value: string, upstream: URL, configuredOrigin: URL, mirrorOrigin: string): string {
  if (!value || value.trimStart().startsWith('data:')) return value;
  return value.split(',').map(part => {
    const trimmed = part.trim();
    if (!trimmed) return trimmed;
    const separator = trimmed.search(/\s/);
    const url = separator < 0 ? trimmed : trimmed.slice(0, separator);
    const descriptor = separator < 0 ? '' : trimmed.slice(separator);
    return `${rewriteResource(url, upstream, configuredOrigin, mirrorOrigin)}${descriptor}`;
  }).join(', ');
}

class NavigationAttributeRewriter {
  constructor(
    private attribute: string,
    private upstream: URL,
    private configuredOrigin: URL,
    private mirrorOrigin: string
  ) {}
  element(element: Element): void {
    const value = element.getAttribute(this.attribute);
    if (value) element.setAttribute(this.attribute, rewriteNavigation(value, this.upstream, this.configuredOrigin, this.mirrorOrigin));
  }
}

class ResourceAttributeRewriter {
  constructor(
    private attribute: string,
    private upstream: URL,
    private configuredOrigin: URL,
    private mirrorOrigin: string
  ) {}
  element(element: Element): void {
    const value = element.getAttribute(this.attribute);
    if (value) element.setAttribute(this.attribute, rewriteResource(value, this.upstream, this.configuredOrigin, this.mirrorOrigin));
  }
}

class LinkRewriter {
  constructor(private upstream: URL, private configuredOrigin: URL, private mirrorOrigin: string) {}
  element(element: Element): void {
    const href = element.getAttribute('href');
    if (!href) return;
    const rel = (element.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
    const resource = rel.some(value => ['stylesheet', 'preload', 'modulepreload', 'icon', 'manifest'].includes(value));
    element.setAttribute('href', resource
      ? rewriteResource(href, this.upstream, this.configuredOrigin, this.mirrorOrigin)
      : rewriteNavigation(href, this.upstream, this.configuredOrigin, this.mirrorOrigin));
  }
}

class SrcsetRewriter {
  constructor(private upstream: URL, private configuredOrigin: URL, private mirrorOrigin: string) {}
  element(element: Element): void {
    const value = element.getAttribute('srcset');
    if (value) element.setAttribute('srcset', rewriteSrcset(value, this.upstream, this.configuredOrigin, this.mirrorOrigin));
  }
}

function rewriteHtml(response: Response, upstream: URL, configuredOrigin: URL, mirrorOrigin: string): Response {
  return new HTMLRewriter()
    .on('a[href]', new NavigationAttributeRewriter('href', upstream, configuredOrigin, mirrorOrigin))
    .on('area[href]', new NavigationAttributeRewriter('href', upstream, configuredOrigin, mirrorOrigin))
    .on('form[action]', new NavigationAttributeRewriter('action', upstream, configuredOrigin, mirrorOrigin))
    .on('base[href]', new NavigationAttributeRewriter('href', upstream, configuredOrigin, mirrorOrigin))
    .on('link[href]', new LinkRewriter(upstream, configuredOrigin, mirrorOrigin))
    .on('script[src]', new ResourceAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin))
    .on('img[src]', new ResourceAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin))
    .on('img[srcset]', new SrcsetRewriter(upstream, configuredOrigin, mirrorOrigin))
    .on('iframe[src]', new ResourceAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin))
    .on('source[src]', new ResourceAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin))
    .on('source[srcset]', new SrcsetRewriter(upstream, configuredOrigin, mirrorOrigin))
    .on('video[src]', new ResourceAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin))
    .on('video[poster]', new ResourceAttributeRewriter('poster', upstream, configuredOrigin, mirrorOrigin))
    .on('audio[src]', new ResourceAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin))
    .transform(response);
}

function setCookies(headers: Headers): string[] {
  const modern = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof modern.getSetCookie === 'function') return modern.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function rewriteSetCookie(value: string): string | null {
  const parts = value.split(';').map(part => part.trim()).filter(Boolean);
  const pair = parts.shift();
  if (!pair || !pair.includes('=')) return null;
  const attributes = parts.filter(part => !/^domain\s*=/i.test(part));
  return [pair, ...attributes].join('; ');
}

function rewriteCsp(value: string, configuredOrigin: URL, mirrorOrigin: string): string {
  const firstPass = value.split(configuredOrigin.origin).join(mirrorOrigin);
  return firstPass.replace(/https:\/\/[A-Za-z0-9.*-]+(?::443)?/g, source => {
    const host = source.replace(/^https:\/\//, '').replace(/^\*\./, '');
    return allowedResourceHost(configuredOrigin.hostname, host) ? mirrorOrigin : source;
  });
}

function proxyTarget(incoming: URL, configuredOrigin: URL): { target: URL; relayed: boolean } {
  if (!incoming.pathname.startsWith(RESOURCE_PREFIX)) {
    return { target: new URL(`${incoming.pathname}${incoming.search}`, configuredOrigin), relayed: false };
  }
  const remainder = incoming.pathname.slice(RESOURCE_PREFIX.length);
  const slash = remainder.indexOf('/');
  const encoded = slash < 0 ? remainder : remainder.slice(0, slash);
  const path = slash < 0 ? '/' : remainder.slice(slash);
  const resourceOrigin = validateResourceOrigin(encoded, configuredOrigin.hostname);
  const target = new URL(`${path}${incoming.search}`, resourceOrigin);
  if (!allowedResourceHost(configuredOrigin.hostname, target.hostname)) throw new HttpError(403, 'mirror resource host is not allowed');
  return { target, relayed: true };
}

function shouldRewriteBody(contentType: string, contentLength: number | null): boolean {
  if (contentLength !== null && contentLength > MAX_REWRITE_BYTES) return false;
  const type = contentType.toLowerCase();
  return type.includes('text/html') || type.includes('text/css') || type.includes('javascript') ||
    type.includes('ecmascript') || type.includes('application/json') || type.includes('manifest+json');
}

export async function mirrorHostRoute(request: Request, env: Env, hostname: string): Promise<Response> {
  const row = await env.DB.prepare(`SELECT id, slug, hostname, origin, origin_host, state
    FROM mirror_targets WHERE lower(hostname) = ?1 AND state = 'active'`).bind(hostname.toLowerCase()).first<MirrorRow>();
  if (!row) throw new HttpError(404, 'mirror not found');

  const configuredOrigin = validateStoredOrigin(row.origin);
  const incoming = new URL(request.url);
  const { target, relayed } = proxyTarget(incoming, configuredOrigin);
  if (!allowedResourceHost(configuredOrigin.hostname, target.hostname) && target.origin !== configuredOrigin.origin) {
    throw new HttpError(403, 'mirror target escaped its configured origin');
  }
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) throw new HttpError(405, 'unsupported mirror method');

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);
  for (const name of SENSITIVE_EDGE_HEADERS) headers.delete(name);
  headers.delete('host');
  if (relayed && !cookiesMayFlow(configuredOrigin.hostname, target.hostname)) {
    headers.delete('cookie');
    headers.delete('authorization');
  }

  const mirrorOrigin = incoming.origin;
  const requestOrigin = headers.get('origin');
  if (requestOrigin === mirrorOrigin) headers.set('origin', configuredOrigin.origin);
  const referer = headers.get('referer');
  if (referer?.startsWith(`${mirrorOrigin}/`)) {
    const ref = new URL(referer);
    const cleanPath = ref.pathname.startsWith(RESOURCE_PREFIX) ? '/' : `${ref.pathname}${ref.search}${ref.hash}`;
    headers.set('referer', `${configuredOrigin.origin}${cleanPath}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
      signal: controller.signal
    });
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') throw new HttpError(504, 'mirror origin timed out');
    throw new HttpError(502, 'mirror origin request failed');
  } finally {
    clearTimeout(timer);
  }

  const output = new Headers(upstream.headers);
  for (const name of HOP_BY_HOP) output.delete(name);
  output.delete('content-length');
  output.delete('set-cookie');
  if (cookiesMayFlow(configuredOrigin.hostname, target.hostname)) {
    for (const cookie of setCookies(upstream.headers)) {
      const rewritten = rewriteSetCookie(cookie);
      if (rewritten) output.append('set-cookie', rewritten);
    }
  }

  const location = output.get('location');
  if (location) {
    output.set('location', relayed
      ? rewriteResource(location, target, configuredOrigin, mirrorOrigin)
      : rewriteNavigation(location, target, configuredOrigin, mirrorOrigin));
  }
  const allowOrigin = output.get('access-control-allow-origin');
  if (allowOrigin === configuredOrigin.origin || allowOrigin === target.origin) output.set('access-control-allow-origin', mirrorOrigin);
  const csp = output.get('content-security-policy');
  if (csp) output.set('content-security-policy', rewriteCsp(csp, configuredOrigin, mirrorOrigin));
  const cspReportOnly = output.get('content-security-policy-report-only');
  if (cspReportOnly) output.set('content-security-policy-report-only', rewriteCsp(cspReportOnly, configuredOrigin, mirrorOrigin));
  output.set('cache-control', 'private, no-store');
  output.set('x-cf-one-mirror', row.slug);
  output.set('x-cf-one-mirror-upstream', relayed ? target.hostname : configuredOrigin.hostname);

  const now = Math.floor(Date.now() / 1000);
  env.DB.prepare('UPDATE mirror_targets SET last_access_at = ?1 WHERE id = ?2').bind(now, row.id).run().catch(() => {});

  const contentType = output.get('content-type') ?? '';
  const lengthHeader = upstream.headers.get('content-length');
  const contentLength = lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null;
  if (request.method !== 'HEAD' && upstream.body && shouldRewriteBody(contentType, contentLength)) {
    let text: string;
    try { text = await upstream.text(); }
    catch { return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: output }); }
    output.delete('content-encoding');
    output.delete('etag');
    output.delete('content-md5');
    output.delete('digest');
    if (contentType.toLowerCase().includes('text/css')) text = rewriteCss(text, target, configuredOrigin, mirrorOrigin);
    else text = rewriteAbsoluteOrigins(text, configuredOrigin, mirrorOrigin);
    let response = new Response(text, { status: upstream.status, statusText: upstream.statusText, headers: output });
    if (contentType.toLowerCase().includes('text/html')) response = rewriteHtml(response, target, configuredOrigin, mirrorOrigin);
    return response;
  }

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: output });
}
