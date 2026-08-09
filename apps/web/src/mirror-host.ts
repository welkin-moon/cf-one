import type { Env } from './env';
import { HttpError } from './http';

const RELAY_PREFIX = '/__cfone_origin__/';
const RELAY_TTL_SECONDS = 24 * 60 * 60;
const MAX_REWRITE_BYTES = 6 * 1024 * 1024;
const INTERNAL_SHARED_COOKIE_HEADER = 'x-cf-one-shared-cookie-names';
const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]{1,128}$/;
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
const SENSITIVE_EDGE_HEADERS = ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'x-forwarded-for', 'x-real-ip', 'cf-visitor', 'cdn-loop'];
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type RelayCache = Map<string, Promise<string>>;

interface MirrorRow {
  id: string;
  slug: string;
  hostname: string;
  origin: string;
  origin_host: string;
  state: 'active';
}

interface RelayContext {
  target: URL;
  relayed: boolean;
  payload: string | null;
  cookiePrefix: string | null;
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new HttpError(400, 'invalid mirror relay token');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  try { return Uint8Array.from(atob(padded), character => character.charCodeAt(0)); }
  catch { throw new HttpError(400, 'invalid mirror relay token'); }
}

function encodeText(value: string): string {
  return encodeBytes(encoder.encode(value));
}

function decodeText(value: string): string {
  return decoder.decode(decodeBytes(value));
}

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function relayKey(env: Env): Promise<CryptoKey> {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new HttpError(503, 'mirror relay signing is unavailable');
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`cf-one:mirror-relay:${env.SESSION_SECRET}`));
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function relaySignature(env: Env, row: MirrorRow, payload: string, expires: number): Promise<string> {
  const message = `${row.id}\n${payload}\n${expires}`;
  const signed = await crypto.subtle.sign('HMAC', await relayKey(env), encoder.encode(message));
  return encodeBytes(new Uint8Array(signed));
}

async function validRelaySignature(env: Env, row: MirrorRow, payload: string, expires: number, signature: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  const message = `${row.id}\n${payload}\n${expires}`;
  try {
    return crypto.subtle.verify('HMAC', await relayKey(env), buffer(decodeBytes(signature)), encoder.encode(message));
  } catch {
    return false;
  }
}

function forbiddenPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') ||
    host.endsWith('.lan') || host.endsWith('.home') || host.endsWith('.test') || host.endsWith('.invalid') || host.endsWith('.example')) return true;
  if (host === 'metadata.google.internal' || host === 'instance-data' || host === 'instance-data.ec2.internal') return true;
  if (host === 'lunarlab.uk' || host.endsWith('.lunarlab.uk') || host === '20100823.xyz' || host.endsWith('.20100823.xyz')) return true;
  if (host.includes(':')) {
    return host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe8') ||
      host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb') || host.startsWith('::ffff:');
  }
  const parts = host.split('.').map(Number);
  if (parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = parts as [number, number, number, number];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }
  return !host.includes('.');
}

function validateStoredOrigin(value: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new HttpError(500, 'mirror origin is invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || forbiddenPublicHost(url.hostname)) {
    throw new HttpError(500, 'mirror origin is invalid');
  }
  return url;
}

function validateRelayOrigin(value: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new HttpError(400, 'invalid mirror relay origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || forbiddenPublicHost(url.hostname)) {
    throw new HttpError(403, 'mirror relay origin is not allowed');
  }
  if (url.port && url.port !== '443') throw new HttpError(403, 'mirror relay port is not allowed');
  return url;
}

function isRelayableUrl(url: URL): boolean {
  return url.protocol === 'https:' && !url.username && !url.password && !forbiddenPublicHost(url.hostname) && (!url.port || url.port === '443');
}

async function cookieNamespace(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return `__cfr_${encodeBytes(new Uint8Array(digest).slice(0, 9))}_`;
}

async function relayToken(env: Env, row: MirrorRow, targetOrigin: string): Promise<string> {
  const payload = encodeText(validateRelayOrigin(targetOrigin).origin);
  const expires = Math.floor(Date.now() / 1000) + RELAY_TTL_SECONDS;
  const signature = await relaySignature(env, row, payload, expires);
  return `${payload}/${expires}.${signature}`;
}

async function relayBase(env: Env, row: MirrorRow, targetOrigin: string, mirrorOrigin: string, cache: RelayCache): Promise<string> {
  const normalized = validateRelayOrigin(targetOrigin).origin;
  let pending = cache.get(normalized);
  if (!pending) {
    pending = relayToken(env, row, normalized);
    cache.set(normalized, pending);
  }
  return `${mirrorOrigin}${RELAY_PREFIX}${await pending}`;
}

async function parseRelay(incoming: URL, configuredOrigin: URL, env: Env, row: MirrorRow): Promise<RelayContext> {
  if (!incoming.pathname.startsWith(RELAY_PREFIX)) {
    return { target: new URL(`${incoming.pathname}${incoming.search}`, configuredOrigin), relayed: false, payload: null, cookiePrefix: null };
  }
  const remainder = incoming.pathname.slice(RELAY_PREFIX.length);
  const firstSlash = remainder.indexOf('/');
  const secondSlash = firstSlash < 0 ? -1 : remainder.indexOf('/', firstSlash + 1);
  if (firstSlash <= 0) throw new HttpError(400, 'invalid mirror relay path');
  const payload = remainder.slice(0, firstSlash);
  const auth = secondSlash < 0 ? remainder.slice(firstSlash + 1) : remainder.slice(firstSlash + 1, secondSlash);
  const path = secondSlash < 0 ? '/' : remainder.slice(secondSlash);
  const [expiresRaw, signature, extra] = auth.split('.');
  const expires = Number(expiresRaw);
  const now = Math.floor(Date.now() / 1000);
  if (!expiresRaw || !signature || extra || !Number.isSafeInteger(expires) || expires < now || expires > now + RELAY_TTL_SECONDS + 300) {
    throw new HttpError(403, 'mirror relay token expired or invalid');
  }
  if (!await validRelaySignature(env, row, payload, expires, signature)) throw new HttpError(403, 'mirror relay signature is invalid');
  const origin = validateRelayOrigin(decodeText(payload));
  return {
    target: new URL(`${path}${incoming.search}`, origin),
    relayed: true,
    payload,
    cookiePrefix: await cookieNamespace(payload)
  };
}

async function rewriteUrl(
  value: string,
  upstream: URL,
  configuredOrigin: URL,
  mirrorOrigin: string,
  env: Env,
  row: MirrorRow,
  cache: RelayCache,
  relayExternal: boolean
): Promise<string> {
  if (!value || /^(?:data|blob|javascript|mailto|tel):/i.test(value)) return value;
  try {
    const resolved = new URL(value, upstream);
    if (resolved.origin === configuredOrigin.origin) return `${mirrorOrigin}${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!relayExternal || !isRelayableUrl(resolved)) return value;
    return `${await relayBase(env, row, resolved.origin, mirrorOrigin, cache)}${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return value;
  }
}

async function replaceAsync(text: string, expression: RegExp, replacer: (match: RegExpExecArray) => Promise<string>): Promise<string> {
  const flags = expression.flags.includes('g') ? expression.flags : `${expression.flags}g`;
  const regex = new RegExp(expression.source, flags);
  let output = '';
  let cursor = 0;
  for (let match = regex.exec(text); match; match = regex.exec(text)) {
    output += text.slice(cursor, match.index);
    output += await replacer(match);
    cursor = match.index + match[0].length;
    if (!match[0]) regex.lastIndex++;
  }
  return output + text.slice(cursor);
}

async function rewriteAbsoluteOrigins(text: string, configuredOrigin: URL, mirrorOrigin: string, env: Env, row: MirrorRow, cache: RelayCache): Promise<string> {
  return replaceAsync(text, /https:\/\/(?:\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9.-]+)(?::\d{1,5})?/g, async match => {
    try {
      const candidate = new URL(match[0]);
      if (candidate.origin === configuredOrigin.origin) return mirrorOrigin;
      if (!isRelayableUrl(candidate)) return match[0];
      return relayBase(env, row, candidate.origin, mirrorOrigin, cache);
    } catch {
      return match[0];
    }
  });
}

async function rewriteCss(text: string, upstream: URL, configuredOrigin: URL, mirrorOrigin: string, env: Env, row: MirrorRow, cache: RelayCache): Promise<string> {
  let output = await rewriteAbsoluteOrigins(text, configuredOrigin, mirrorOrigin, env, row, cache);
  output = await replaceAsync(output, /url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi, async match => {
    const quote = match[1] ?? '';
    const value = (match[2] ?? '').trim();
    const rewritten = await rewriteUrl(value, upstream, configuredOrigin, mirrorOrigin, env, row, cache, true);
    return rewritten === value ? match[0] : `url(${quote}${rewritten}${quote})`;
  });
  return replaceAsync(output, /@import\s+(['"])([^'"]+)\1/gi, async match => {
    const value = match[2] ?? '';
    const rewritten = await rewriteUrl(value, upstream, configuredOrigin, mirrorOrigin, env, row, cache, true);
    return `@import ${match[1]}${rewritten}${match[1]}`;
  });
}

async function rewriteInlineBlocks(html: string, upstream: URL, configuredOrigin: URL, mirrorOrigin: string, env: Env, row: MirrorRow, cache: RelayCache): Promise<string> {
  let output = await replaceAsync(html, /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, async match => {
    if (/\bsrc\s*=/i.test(match[1] ?? '')) return match[0];
    return `${match[1]}${await rewriteAbsoluteOrigins(match[2] ?? '', configuredOrigin, mirrorOrigin, env, row, cache)}${match[3]}`;
  });
  output = await replaceAsync(output, /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, async match =>
    `${match[1]}${await rewriteCss(match[2] ?? '', upstream, configuredOrigin, mirrorOrigin, env, row, cache)}${match[3]}`
  );
  return output;
}

async function rewriteSrcset(value: string, upstream: URL, configuredOrigin: URL, mirrorOrigin: string, env: Env, row: MirrorRow, cache: RelayCache): Promise<string> {
  if (!value || value.trimStart().startsWith('data:')) return value;
  const output: string[] = [];
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.search(/\s/);
    const url = separator < 0 ? trimmed : trimmed.slice(0, separator);
    const descriptor = separator < 0 ? '' : trimmed.slice(separator);
    output.push(`${await rewriteUrl(url, upstream, configuredOrigin, mirrorOrigin, env, row, cache, true)}${descriptor}`);
  }
  return output.join(', ');
}

class UrlAttributeRewriter {
  constructor(
    private attribute: string,
    private upstream: URL,
    private configuredOrigin: URL,
    private mirrorOrigin: string,
    private env: Env,
    private row: MirrorRow,
    private cache: RelayCache,
    private relayExternal: boolean
  ) {}
  async element(element: Element): Promise<void> {
    const value = element.getAttribute(this.attribute);
    if (!value) return;
    const rewritten = await rewriteUrl(value, this.upstream, this.configuredOrigin, this.mirrorOrigin, this.env, this.row, this.cache, this.relayExternal);
    element.setAttribute(this.attribute, rewritten);
    if (rewritten !== value && element.getAttribute('integrity')) element.removeAttribute('integrity');
  }
}

class LinkRewriter {
  constructor(private upstream: URL, private configuredOrigin: URL, private mirrorOrigin: string, private env: Env, private row: MirrorRow, private cache: RelayCache) {}
  async element(element: Element): Promise<void> {
    const href = element.getAttribute('href');
    if (!href) return;
    const rel = (element.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
    const resource = rel.some(value => ['stylesheet', 'preload', 'modulepreload', 'icon', 'manifest'].includes(value));
    const rewritten = await rewriteUrl(href, this.upstream, this.configuredOrigin, this.mirrorOrigin, this.env, this.row, this.cache, resource);
    element.setAttribute('href', rewritten);
    if (rewritten !== href && element.getAttribute('integrity')) element.removeAttribute('integrity');
  }
}

class SrcsetRewriter {
  constructor(private upstream: URL, private configuredOrigin: URL, private mirrorOrigin: string, private env: Env, private row: MirrorRow, private cache: RelayCache) {}
  async element(element: Element): Promise<void> {
    const value = element.getAttribute('srcset');
    if (value) element.setAttribute('srcset', await rewriteSrcset(value, this.upstream, this.configuredOrigin, this.mirrorOrigin, this.env, this.row, this.cache));
  }
}

class StyleAttributeRewriter {
  constructor(private upstream: URL, private configuredOrigin: URL, private mirrorOrigin: string, private env: Env, private row: MirrorRow, private cache: RelayCache) {}
  async element(element: Element): Promise<void> {
    const value = element.getAttribute('style');
    if (value) element.setAttribute('style', await rewriteCss(value, this.upstream, this.configuredOrigin, this.mirrorOrigin, this.env, this.row, this.cache));
  }
}

function rewriteHtml(response: Response, upstream: URL, configuredOrigin: URL, mirrorOrigin: string, env: Env, row: MirrorRow, cache: RelayCache): Response {
  return new HTMLRewriter()
    .on('a[href]', new UrlAttributeRewriter('href', upstream, configuredOrigin, mirrorOrigin, env, row, cache, false))
    .on('area[href]', new UrlAttributeRewriter('href', upstream, configuredOrigin, mirrorOrigin, env, row, cache, false))
    .on('form[action]', new UrlAttributeRewriter('action', upstream, configuredOrigin, mirrorOrigin, env, row, cache, false))
    .on('base[href]', new UrlAttributeRewriter('href', upstream, configuredOrigin, mirrorOrigin, env, row, cache, false))
    .on('link[href]', new LinkRewriter(upstream, configuredOrigin, mirrorOrigin, env, row, cache))
    .on('script[src]', new UrlAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin, env, row, cache, true))
    .on('[style]', new StyleAttributeRewriter(upstream, configuredOrigin, mirrorOrigin, env, row, cache))
    .on('img[src]', new UrlAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin, env, row, cache, true))
    .on('img[srcset]', new SrcsetRewriter(upstream, configuredOrigin, mirrorOrigin, env, row, cache))
    .on('source[src]', new UrlAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin, env, row, cache, true))
    .on('source[srcset]', new SrcsetRewriter(upstream, configuredOrigin, mirrorOrigin, env, row, cache))
    .on('video[src]', new UrlAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin, env, row, cache, true))
    .on('video[poster]', new UrlAttributeRewriter('poster', upstream, configuredOrigin, mirrorOrigin, env, row, cache, true))
    .on('audio[src]', new UrlAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin, env, row, cache, true))
    .on('track[src]', new UrlAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin, env, row, cache, true))
    // Do not relay cross-origin frames onto the mirror hostname: that would collapse the
    // browser's same-origin isolation between an embedded document and its parent.
    .on('iframe[src]', new UrlAttributeRewriter('src', upstream, configuredOrigin, mirrorOrigin, env, row, cache, false))
    .transform(response);
}

function parseCookies(value: string): Array<[string, string]> {
  const output: Array<[string, string]> = [];
  for (const part of value.split(';')) {
    const trimmed = part.trim();
    const index = trimmed.indexOf('=');
    if (index > 0) output.push([trimmed.slice(0, index), trimmed.slice(index + 1)]);
  }
  return output;
}

function parseSharedCookieNames(value: string | null): Set<string> {
  const output = new Set<string>();
  if (!value) return output;
  for (const part of value.split(',')) {
    const name = part.trim();
    if (COOKIE_NAME.test(name) && !name.startsWith('__cfr_')) output.add(name);
  }
  return output;
}

function sameSiteRelayTarget(target: URL, configuredOrigin: URL): boolean {
  const targetHost = target.hostname.toLowerCase();
  const configuredHost = configuredOrigin.hostname.toLowerCase();
  return targetHost === configuredHost || targetHost.endsWith(`.${configuredHost}`);
}

function mainCookieHeader(value: string): string {
  return parseCookies(value).filter(([name]) => !name.startsWith('__cfr_')).map(([name, cookieValue]) => `${name}=${cookieValue}`).join('; ');
}

function relayCookieHeader(value: string, prefix: string, sharedNames: Set<string>): string {
  const merged = new Map<string, string>();
  for (const [name, cookieValue] of parseCookies(value)) {
    if (sharedNames.has(name) && !name.startsWith('__cfr_')) merged.set(name, cookieValue);
  }
  for (const [name, cookieValue] of parseCookies(value)) {
    if (name.startsWith(prefix)) merged.set(name.slice(prefix.length), cookieValue);
  }
  return Array.from(merged, ([name, cookieValue]) => `${name}=${cookieValue}`).join('; ');
}

function setCookies(headers: Headers): string[] {
  const modern = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof modern.getSetCookie === 'function') return modern.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function rewriteSetCookie(value: string, prefix = '', relayPayload = ''): string | null {
  const parts = value.split(';').map(part => part.trim()).filter(Boolean);
  const pair = parts.shift();
  if (!pair) return null;
  const index = pair.indexOf('=');
  if (index <= 0) return null;
  const name = pair.slice(0, index);
  const cookieValue = pair.slice(index + 1);
  const attributes = parts.filter(part => !/^domain\s*=/i.test(part) && !/^path\s*=/i.test(part));
  const path = prefix ? `${RELAY_PREFIX}${relayPayload}/` : '/';
  attributes.push(`Path=${path}`);
  return [`${prefix}${name}=${cookieValue}`, ...attributes].join('; ');
}

function rewriteCsp(value: string): string {
  const result: string[] = [];
  for (const raw of value.split(';').map(part => part.trim()).filter(Boolean)) {
    const [name, ...sources] = raw.split(/\s+/);
    if (!name || name === 'report-uri' || name === 'report-to') continue;
    const output: string[] = [];
    let replacedHost = false;
    for (const source of sources) {
      if (/^https:\/\//i.test(source) || /^\*\./.test(source)) {
        replacedHost = true;
        continue;
      }
      if (!output.includes(source)) output.push(source);
    }
    if (replacedHost && !output.includes("'self'")) output.push("'self'");
    result.push([name, ...output].join(' '));
  }
  return result.join('; ');
}

function shouldRewriteBody(contentType: string, contentLength: number | null): boolean {
  if (contentLength !== null && contentLength > MAX_REWRITE_BYTES) return false;
  const type = contentType.toLowerCase();
  return type.includes('text/html') || type.includes('text/css') || type.includes('javascript') || type.includes('ecmascript') ||
    type.includes('application/json') || type.includes('manifest+json') || type.includes('application/xml') || type.includes('text/xml');
}

async function mappedReferer(referer: string, mirrorOrigin: string, configuredOrigin: URL, env: Env, row: MirrorRow): Promise<string | null> {
  if (!referer.startsWith(`${mirrorOrigin}/`)) return referer;
  try {
    const incoming = new URL(referer);
    const mapped = await parseRelay(incoming, configuredOrigin, env, row);
    return mapped.target.href;
  } catch {
    return configuredOrigin.origin + '/';
  }
}

export async function mirrorHostRoute(request: Request, env: Env, hostname: string): Promise<Response> {
  const row = await env.DB.prepare(`SELECT id, slug, hostname, origin, origin_host, state
    FROM mirror_targets WHERE lower(hostname) = ?1 AND state = 'active'`).bind(hostname.toLowerCase()).first<MirrorRow>();
  if (!row) throw new HttpError(404, 'mirror not found');

  const configuredOrigin = validateStoredOrigin(row.origin);
  const incoming = new URL(request.url);
  const relay = await parseRelay(incoming, configuredOrigin, env, row);
  const target = relay.target;
  if (!isRelayableUrl(target) && target.origin !== configuredOrigin.origin) throw new HttpError(403, 'mirror target is not allowed');
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) throw new HttpError(405, 'unsupported mirror method');

  const headers = new Headers(request.headers);
  const requestedSharedCookies = parseSharedCookieNames(headers.get(INTERNAL_SHARED_COOKIE_HEADER));
  headers.delete(INTERNAL_SHARED_COOKIE_HEADER);
  for (const name of HOP_BY_HOP) headers.delete(name);
  for (const name of SENSITIVE_EDGE_HEADERS) headers.delete(name);
  headers.delete('host');
  if (relay.relayed) headers.delete('sec-fetch-site');

  const rawCookies = headers.get('cookie') ?? '';
  const sharedCookies = relay.relayed && sameSiteRelayTarget(target, configuredOrigin) ? requestedSharedCookies : new Set<string>();
  const upstreamCookies = relay.relayed && relay.cookiePrefix
    ? relayCookieHeader(rawCookies, relay.cookiePrefix, sharedCookies)
    : mainCookieHeader(rawCookies);
  if (upstreamCookies) headers.set('cookie', upstreamCookies); else headers.delete('cookie');

  const mirrorOrigin = incoming.origin;
  if (headers.get('origin') === mirrorOrigin) headers.set('origin', configuredOrigin.origin);
  const referer = headers.get('referer');
  if (referer) {
    const mapped = await mappedReferer(referer, mirrorOrigin, configuredOrigin, env, row);
    if (mapped) headers.set('referer', mapped); else headers.delete('referer');
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
  output.delete('link');
  output.delete('alt-svc');
  output.delete('report-to');
  output.delete('nel');
  if (relay.relayed) output.delete('clear-site-data');

  for (const cookie of setCookies(upstream.headers)) {
    const rewritten = relay.relayed && relay.cookiePrefix && relay.payload
      ? rewriteSetCookie(cookie, relay.cookiePrefix, relay.payload)
      : rewriteSetCookie(cookie);
    if (rewritten) output.append('set-cookie', rewritten);
  }

  const relayCache: RelayCache = new Map();
  const location = output.get('location');
  if (location) {
    const navigation = request.headers.get('sec-fetch-mode') === 'navigate';
    output.set('location', await rewriteUrl(location, target, configuredOrigin, mirrorOrigin, env, row, relayCache, !navigation));
  }
  const allowOrigin = output.get('access-control-allow-origin');
  if (allowOrigin === configuredOrigin.origin || allowOrigin === target.origin) output.set('access-control-allow-origin', mirrorOrigin);
  const csp = output.get('content-security-policy');
  if (csp) output.set('content-security-policy', rewriteCsp(csp));
  const cspReportOnly = output.get('content-security-policy-report-only');
  if (cspReportOnly) output.set('content-security-policy-report-only', rewriteCsp(cspReportOnly));
  output.set('cache-control', 'private, no-store');
  output.set('x-cf-one-mirror', row.slug);

  env.DB.prepare('UPDATE mirror_targets SET last_access_at = ?1 WHERE id = ?2')
    .bind(Math.floor(Date.now() / 1000), row.id).run().catch(() => {});

  const contentType = output.get('content-type') ?? '';
  const lengthHeader = upstream.headers.get('content-length');
  const contentLength = lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null;
  if (request.method !== 'HEAD' && upstream.body && shouldRewriteBody(contentType, contentLength)) {
    let text = await upstream.text();
    output.delete('content-encoding');
    output.delete('etag');
    output.delete('content-md5');
    output.delete('digest');
    const lowerType = contentType.toLowerCase();
    if (lowerType.includes('text/css')) text = await rewriteCss(text, target, configuredOrigin, mirrorOrigin, env, row, relayCache);
    else if (lowerType.includes('text/html')) text = await rewriteInlineBlocks(text, target, configuredOrigin, mirrorOrigin, env, row, relayCache);
    else text = await rewriteAbsoluteOrigins(text, configuredOrigin, mirrorOrigin, env, row, relayCache);
    let response = new Response(text, { status: upstream.status, statusText: upstream.statusText, headers: output });
    if (lowerType.includes('text/html')) response = rewriteHtml(response, target, configuredOrigin, mirrorOrigin, env, row, relayCache);
    return response;
  }

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: output });
}
