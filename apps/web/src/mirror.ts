import type { Env, Session } from './env';
import { isCurrentAdmin, isOwner, requireSession } from './auth';
import { HttpError, json, readJson } from './http';
import { requireCsrf } from './security';

const MIRROR_ZONE = '20100823.xyz';
const MIRROR_SERVICE = 'cf-one-apex';
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
const SENSITIVE_EDGE_HEADERS = ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'x-forwarded-for', 'x-real-ip', 'cf-visitor', 'cdn-loop'];

interface MirrorRow {
  id: string;
  owner_id: string;
  slug: string;
  hostname: string;
  origin: string;
  origin_host: string;
  label: string;
  state: 'pending' | 'active' | 'suspended' | 'rejected' | 'expired';
  domain_id: string | null;
  created_at: number;
  approved_at: number | null;
  last_access_at: number | null;
}

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
}

interface WorkerDomain {
  id: string;
  hostname: string;
  service: string;
}

interface ZoneRecord {
  id: string;
  name: string;
}

function forbiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === 'lunarlab.uk' || host.endsWith('.lunarlab.uk') || host === MIRROR_ZONE || host.endsWith(`.${MIRROR_ZONE}`)) return true;
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

function validateOrigin(raw: unknown): URL {
  if (typeof raw !== 'string' || raw.length > 2048) throw new HttpError(400, 'HTTPS origin required');
  let url: URL;
  try { url = new URL(raw.trim()); }
  catch { throw new HttpError(400, 'valid HTTPS origin required'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new HttpError(400, 'origin must be a credential-free HTTPS origin without a path');
  }
  if (forbiddenHost(url.hostname)) throw new HttpError(400, 'private, local, and cf-one origins are blocked');
  if (!url.hostname.includes('.')) throw new HttpError(400, 'public DNS hostname required');
  return url;
}

function account(env: Env): string {
  if (!env.CF_ACCOUNT_ID || !/^[a-f0-9]{32}$/i.test(env.CF_ACCOUNT_ID)) throw new HttpError(503, 'mirror provisioning account is not configured');
  return env.CF_ACCOUNT_ID;
}

async function cloudflare<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  if (!env.CF_API_TOKEN) throw new HttpError(503, 'mirror provisioning token is not configured');
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${env.CF_API_TOKEN}`);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, { ...init, headers });
  const body = await response.json<CloudflareEnvelope<T>>().catch(() => ({ success: false, result: null as T }));
  if (!response.ok || !body.success) throw new HttpError(502, 'Cloudflare mirror-domain operation failed');
  return body.result;
}

async function nextSequence(env: Env): Promise<number> {
  await env.DB.prepare('INSERT OR IGNORE INTO mirror_sequence (id, next_value) VALUES (1, 1)').run();
  const row = await env.DB.prepare(`UPDATE mirror_sequence SET next_value = next_value + 1 WHERE id = 1
    RETURNING next_value - 1 AS value`).first<{ value: number }>();
  if (!row || !Number.isSafeInteger(row.value) || row.value < 1) throw new HttpError(500, 'mirror sequence allocation failed');
  return row.value;
}

async function hostnameAvailable(env: Env, hostname: string): Promise<boolean> {
  const encoded = encodeURIComponent(hostname);
  const domains = await cloudflare<WorkerDomain[]>(env, `/accounts/${account(env)}/workers/domains?hostname=${encoded}`);
  if (domains.length) return false;
  const zones = await cloudflare<ZoneRecord[]>(env, `/zones?name=${encodeURIComponent(MIRROR_ZONE)}&per_page=1`);
  const zone = zones[0];
  if (!zone) throw new HttpError(503, 'mirror zone is unavailable');
  const records = await cloudflare<Array<{ id: string }>>(env, `/zones/${zone.id}/dns_records?name=${encoded}&per_page=1`);
  return records.length === 0;
}

async function allocateHostname(env: Env): Promise<{ sequence: number; hostname: string }> {
  for (let attempt = 0; attempt < 32; attempt++) {
    const sequence = await nextSequence(env);
    const hostname = `m${sequence}.${MIRROR_ZONE}`;
    const local = await env.DB.prepare('SELECT 1 AS occupied FROM mirror_targets WHERE hostname = ?1').bind(hostname).first();
    if (local) continue;
    if (await hostnameAvailable(env, hostname)) return { sequence, hostname };
  }
  throw new HttpError(503, 'could not allocate an unused mirror hostname');
}

async function attachDomain(env: Env, hostname: string): Promise<string> {
  const result = await cloudflare<WorkerDomain>(env, `/accounts/${account(env)}/workers/domains`, {
    method: 'PUT',
    body: JSON.stringify({ hostname, service: MIRROR_SERVICE })
  });
  if (!result?.id) throw new HttpError(502, 'Cloudflare did not return a mirror domain id');
  return result.id;
}

async function detachDomain(env: Env, row: MirrorRow): Promise<void> {
  let domainId = row.domain_id;
  if (!domainId) {
    const domains = await cloudflare<WorkerDomain[]>(env, `/accounts/${account(env)}/workers/domains?hostname=${encodeURIComponent(row.hostname)}`);
    const owned = domains.find(domain => domain.hostname.toLowerCase() === row.hostname.toLowerCase() && domain.service === MIRROR_SERVICE);
    domainId = owned?.id ?? null;
  }
  if (!domainId) return;
  await cloudflare<unknown>(env, `/accounts/${account(env)}/workers/domains/${domainId}`, { method: 'DELETE' });
}

function publicMirror(row: MirrorRow): Record<string, unknown> {
  return {
    id: row.id,
    hostname: row.hostname,
    url: `https://${row.hostname}/`,
    origin: row.origin,
    label: row.label,
    state: row.state,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    approvedAt: row.approved_at ? new Date(row.approved_at * 1000).toISOString() : null,
    lastAccessAt: row.last_access_at ? new Date(row.last_access_at * 1000).toISOString() : null
  };
}

async function listMirrors(env: Env, session: Session): Promise<MirrorRow[]> {
  const query = isOwner(session)
    ? env.DB.prepare(`SELECT id, owner_id, slug, hostname, origin, origin_host, label, state, domain_id, created_at, approved_at, last_access_at
        FROM mirror_targets ORDER BY created_at DESC LIMIT 200`)
    : env.DB.prepare(`SELECT id, owner_id, slug, hostname, origin, origin_host, label, state, domain_id, created_at, approved_at, last_access_at
        FROM mirror_targets WHERE owner_id = ?1 ORDER BY created_at DESC LIMIT 50`).bind(session.sub);
  const result = await query.all<MirrorRow>();
  return result.results;
}

export async function mirrorApiRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/mirror/')) return null;
  const session = await requireSession(request, env);

  if (path === '/api/mirror/targets' && request.method === 'GET') {
    return json({ targets: (await listMirrors(env, session)).map(publicMirror), owner: isOwner(session) });
  }

  if (path === '/api/mirror/targets' && request.method === 'POST') {
    requireCsrf(request, session);
    const policy = await env.DB.prepare(`SELECT enabled, self_service_enabled, active_target_limit FROM mirror_policy WHERE id = 1`)
      .first<{ enabled: number; self_service_enabled: number; active_target_limit: number }>();
    if (policy && (!policy.enabled || (!policy.self_service_enabled && !isCurrentAdmin(session)))) throw new HttpError(403, 'mirror self-service is disabled');
    const active = await env.DB.prepare(`SELECT COUNT(*) AS count FROM mirror_targets WHERE owner_id = ?1 AND state IN ('pending', 'active')`)
      .bind(session.sub).first<{ count: number }>();
    const limit = Math.max(1, Math.min(20, policy?.active_target_limit ?? 2));
    if ((active?.count ?? 0) >= limit && !isOwner(session)) throw new HttpError(409, `active mirror limit is ${limit}`);

    const body = await readJson<{ origin?: unknown; label?: unknown }>(request);
    const origin = validateOrigin(body.origin);
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : origin.hostname;
    const allocation = await allocateHostname(env);
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`INSERT INTO mirror_targets
      (id, owner_id, slug, hostname, origin, origin_host, label, state, auto_approved, decision_note, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', 1, '', ?8)`)
      .bind(id, session.sub, `m${allocation.sequence}`, allocation.hostname, origin.origin, origin.hostname, label, now).run();
    try {
      const domainId = await attachDomain(env, allocation.hostname);
      await env.DB.prepare(`UPDATE mirror_targets SET state = 'active', domain_id = ?1, approved_at = ?2 WHERE id = ?3`)
        .bind(domainId, now, id).run();
      await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)')
        .bind(session.sub, 'mirror.create', allocation.hostname).run();
    } catch (error) {
      await env.DB.prepare(`UPDATE mirror_targets SET state = 'rejected', decision_note = 'Cloudflare domain provisioning failed' WHERE id = ?1`).bind(id).run();
      throw error;
    }
    const row = await env.DB.prepare(`SELECT id, owner_id, slug, hostname, origin, origin_host, label, state, domain_id, created_at, approved_at, last_access_at
      FROM mirror_targets WHERE id = ?1`).bind(id).first<MirrorRow>();
    if (!row) throw new HttpError(500, 'mirror creation state was lost');
    return json({ target: publicMirror(row) }, 201);
  }

  const targetMatch = path.match(/^\/api\/mirror\/targets\/([0-9a-f-]{36})$/i);
  if (targetMatch && request.method === 'DELETE') {
    requireCsrf(request, session);
    const row = await env.DB.prepare(`SELECT id, owner_id, slug, hostname, origin, origin_host, label, state, domain_id, created_at, approved_at, last_access_at
      FROM mirror_targets WHERE id = ?1`).bind(targetMatch[1]!).first<MirrorRow>();
    if (!row) throw new HttpError(404, 'mirror target not found');
    if (row.owner_id !== session.sub && !isOwner(session)) throw new HttpError(403, 'only the mirror owner or site owner can remove it');
    if (row.state === 'active' || row.state === 'pending') await detachDomain(env, row);
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`UPDATE mirror_targets SET state = 'suspended', suspended_at = ?1 WHERE id = ?2`).bind(now, row.id).run();
    await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)')
      .bind(session.sub, 'mirror.remove', row.hostname).run();
    return json({ ok: true });
  }

  throw new HttpError(404, 'mirror route not found');
}

export function isMirrorHostname(hostname: string): boolean {
  return /^m[1-9][0-9]*\.20100823\.xyz$/i.test(hostname);
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

function rewriteUrl(value: string, upstream: URL, mirrorOrigin: string): string {
  if (!value || /^(?:data|blob|javascript|mailto|tel):/i.test(value)) return value;
  try {
    const resolved = new URL(value, upstream);
    if (resolved.origin !== upstream.origin) return value;
    return `${mirrorOrigin}${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return value;
  }
}

class AttributeRewriter {
  constructor(private attribute: string, private upstream: URL, private mirrorOrigin: string) {}
  element(element: Element): void {
    const value = element.getAttribute(this.attribute);
    if (value) element.setAttribute(this.attribute, rewriteUrl(value, this.upstream, this.mirrorOrigin));
  }
}

function rewriteHtml(response: Response, upstream: URL, mirrorOrigin: string): Response {
  return new HTMLRewriter()
    .on('a[href]', new AttributeRewriter('href', upstream, mirrorOrigin))
    .on('area[href]', new AttributeRewriter('href', upstream, mirrorOrigin))
    .on('form[action]', new AttributeRewriter('action', upstream, mirrorOrigin))
    .on('link[href]', new AttributeRewriter('href', upstream, mirrorOrigin))
    .on('script[src]', new AttributeRewriter('src', upstream, mirrorOrigin))
    .on('img[src]', new AttributeRewriter('src', upstream, mirrorOrigin))
    .on('iframe[src]', new AttributeRewriter('src', upstream, mirrorOrigin))
    .on('source[src]', new AttributeRewriter('src', upstream, mirrorOrigin))
    .transform(response);
}

export async function mirrorHostRoute(request: Request, env: Env, hostname: string): Promise<Response> {
  const row = await env.DB.prepare(`SELECT id, owner_id, slug, hostname, origin, origin_host, label, state, domain_id, created_at, approved_at, last_access_at
    FROM mirror_targets WHERE lower(hostname) = ?1 AND state = 'active'`).bind(hostname.toLowerCase()).first<MirrorRow>();
  if (!row) throw new HttpError(404, 'mirror not found');
  const origin = validateOrigin(row.origin);
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, origin);
  if (target.origin !== origin.origin) throw new HttpError(400, 'mirror target escaped its configured origin');
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) throw new HttpError(405, 'unsupported mirror method');

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);
  for (const name of SENSITIVE_EDGE_HEADERS) headers.delete(name);
  headers.delete('host');
  const mirrorOrigin = incoming.origin;
  const requestOrigin = headers.get('origin');
  if (requestOrigin === mirrorOrigin) headers.set('origin', origin.origin);
  const referer = headers.get('referer');
  if (referer?.startsWith(`${mirrorOrigin}/`)) headers.set('referer', `${origin.origin}${referer.slice(mirrorOrigin.length)}`);

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual'
  });
  const output = new Headers(upstream.headers);
  for (const name of HOP_BY_HOP) output.delete(name);
  output.delete('set-cookie');
  output.delete('content-length');
  for (const cookie of setCookies(upstream.headers)) {
    const rewritten = rewriteSetCookie(cookie);
    if (rewritten) output.append('set-cookie', rewritten);
  }
  const location = output.get('location');
  if (location) output.set('location', rewriteUrl(location, target, mirrorOrigin));
  const allowOrigin = output.get('access-control-allow-origin');
  if (allowOrigin === origin.origin) output.set('access-control-allow-origin', mirrorOrigin);
  const csp = output.get('content-security-policy');
  if (csp?.includes(origin.origin)) output.set('content-security-policy', csp.split(origin.origin).join(mirrorOrigin));
  output.set('cache-control', 'private, no-store');
  output.set('x-cf-one-mirror', row.slug);

  const now = Math.floor(Date.now() / 1000);
  env.DB.prepare('UPDATE mirror_targets SET last_access_at = ?1 WHERE id = ?2').bind(now, row.id).run().catch(() => {});
  let response = new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: output });
  if (output.get('content-type')?.toLowerCase().includes('text/html')) response = rewriteHtml(response, origin, mirrorOrigin);
  return response;
}
