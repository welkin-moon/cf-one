import type { Env, Session } from './env';
import { requireAdmin } from './auth';
import { HttpError, json, readJson } from './http';
import { requireCsrf } from './security';

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
  result_info?: unknown;
}

interface ZoneResult {
  id: string;
  name: string;
  status?: string;
}

async function cloudflare<T>(env: Env, path: string, init: RequestInit = {}): Promise<CloudflareEnvelope<T>> {
  if (!env.CF_API_TOKEN) throw new HttpError(503, 'CF_API_TOKEN is not configured as a Worker secret');
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${env.CF_API_TOKEN}`);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, { ...init, headers });
  const body: CloudflareEnvelope<T> = await response.json<CloudflareEnvelope<T>>().catch(() => ({ success: false, result: null as T }));
  if (!response.ok || !body.success) {
    const detail = body.errors?.map(error => error.message).filter(Boolean).join('; ');
    throw new HttpError(response.status >= 400 && response.status < 600 ? response.status : 502, detail ? `Cloudflare API: ${detail}` : 'Cloudflare API request failed');
  }
  return body;
}

function managedZones(env: Env): Set<string> {
  return new Set(env.MANAGED_ZONES.split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
}

async function assertManagedZone(env: Env, zoneId: string): Promise<ZoneResult> {
  if (!/^[a-f0-9]{32}$/i.test(zoneId)) throw new HttpError(400, 'invalid zone id');
  const zone = (await cloudflare<ZoneResult>(env, `/zones/${zoneId}`)).result;
  if (!managedZones(env).has(zone.name.toLowerCase())) throw new HttpError(403, 'zone is outside MANAGED_ZONES');
  return zone;
}

async function audit(env: Env, session: Session, action: string, target: string): Promise<void> {
  await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)')
    .bind(session.sub, action, target).run();
}

function requireConfirmation(actual: unknown, expected: string): void {
  if (actual !== expected) throw new HttpError(400, `confirmation must equal ${expected}`);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function integer(value: unknown): number | null {
  if (typeof value === 'string' && value.trim()) value = Number(value);
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

export async function adminRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/admin/')) return null;
  const session = await requireAdmin(request, env);

  if (path === '/api/admin/status' && request.method === 'GET') {
    return json({
      worker: 'cf-one',
      bindings: { d1: Boolean(env.DB), kv: Boolean(env.CACHE), r2: Boolean(env.MEDIA), emailSend: Boolean(env.EMAIL) },
      cloudflareApi: Boolean(env.CF_API_TOKEN),
      accountId: env.CF_ACCOUNT_ID ? `${env.CF_ACCOUNT_ID.slice(0, 6)}…${env.CF_ACCOUNT_ID.slice(-4)}` : null,
      managedZones: [...managedZones(env)],
      deviceBinding: env.DEVICE_BINDING,
      mirrorAliases: Object.keys(parseMirrorTargets(env))
    });
  }

  if (path === '/api/admin/mirror-targets' && request.method === 'GET') {
    const entries = Object.entries(parseMirrorTargets(env)).map(([alias, target]) => ({
      alias,
      label: typeof target.label === 'string' ? target.label : alias,
      origin: target.origin,
      cookies: Boolean(target.allowCookies),
      rewriteHtml: target.rewriteHtml !== false
    }));
    return json({ targets: entries });
  }

  if (path === '/api/admin/cf/zones' && request.method === 'GET') {
    const response = await cloudflare<ZoneResult[]>(env, '/zones?per_page=50');
    response.result = response.result.filter(zone => managedZones(env).has(zone.name.toLowerCase()));
    await audit(env, session, 'cf.zones.list', 'zones');
    return json(response);
  }

  if (path === '/api/admin/cf/resources' && request.method === 'GET') {
    const accountId = env.CF_ACCOUNT_ID;
    if (!accountId) throw new HttpError(503, 'CF_ACCOUNT_ID is not configured');
    const account = encodeURIComponent(accountId);
    const [d1, kv, r2] = await Promise.all([
      cloudflare<unknown[]>(env, `/accounts/${account}/d1/database?per_page=100`),
      cloudflare<unknown[]>(env, `/accounts/${account}/storage/kv/namespaces?per_page=100&page=1`),
      cloudflare<{ buckets?: unknown[] }>(env, `/accounts/${account}/r2/buckets`)
    ]);
    await audit(env, session, 'cf.resources.list', accountId);
    return json({ d1: d1.result, kv: kv.result, r2: r2.result });
  }

  const dnsCollection = path.match(/^\/api\/admin\/cf\/zones\/([a-f0-9]{32})\/dns-records$/i);
  if (dnsCollection && request.method === 'GET') {
    await assertManagedZone(env, dnsCollection[1]!);
    await audit(env, session, 'cf.dns.list', dnsCollection[1]!);
    return json(await cloudflare<unknown[]>(env, `/zones/${dnsCollection[1]!}/dns_records?per_page=100`));
  }
  if (dnsCollection && request.method === 'POST') {
    requireCsrf(request, session);
    const zone = await assertManagedZone(env, dnsCollection[1]!);
    const body = await readJson<{ type?: unknown; name?: unknown; content?: unknown; ttl?: unknown; priority?: unknown; proxied?: unknown; confirmation?: unknown }>(request);
    const name = text(body.name).trim().toLowerCase();
    const type = text(body.type).trim().toUpperCase();
    const content = text(body.content).trim();
    const ttl = body.ttl === undefined ? 1 : integer(body.ttl);
    const priority = integer(body.priority);
    if (!['A', 'AAAA', 'CNAME', 'TXT', 'MX'].includes(type)) throw new HttpError(400, 'unsupported DNS record type');
    if (!name || name.length > 253 || !content || content.length > 4096) throw new HttpError(400, 'invalid DNS record');
    if (ttl === null || (ttl !== 1 && (ttl < 60 || ttl > 86400))) throw new HttpError(400, 'invalid DNS TTL');
    if (body.proxied !== undefined && typeof body.proxied !== 'boolean') throw new HttpError(400, 'proxied must be boolean');
    if (type === 'MX' && (priority === null || priority < 0 || priority > 65535)) throw new HttpError(400, 'MX priority must be 0–65535');
    if (!(name === zone.name || name.endsWith(`.${zone.name}`))) throw new HttpError(400, 'record name is outside the selected zone');
    requireConfirmation(body.confirmation, `CREATE ${name}`);
    const record: Record<string, unknown> = { type, name, content, ttl, proxied: body.proxied ?? false };
    if (type === 'MX') record.priority = priority;
    const result = await cloudflare<unknown>(env, `/zones/${dnsCollection[1]}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
    await audit(env, session, 'cf.dns.create', `${zone.name}:${type}:${name}`);
    return json(result, 201);
  }

  const dnsRecord = path.match(/^\/api\/admin\/cf\/zones\/([a-f0-9]{32})\/dns-records\/([a-f0-9]{32})$/i);
  if (dnsRecord && request.method === 'PATCH') {
    requireCsrf(request, session);
    const zone = await assertManagedZone(env, dnsRecord[1]!);
    const body = await readJson<{ type?: unknown; name?: unknown; content?: unknown; ttl?: unknown; priority?: unknown; proxied?: unknown; confirmation?: unknown }>(request);
    requireConfirmation(body.confirmation, `UPDATE ${dnsRecord[2]}`);
    const name = body.name === undefined ? undefined : text(body.name).trim().toLowerCase();
    const type = body.type === undefined ? undefined : text(body.type).trim().toUpperCase();
    const content = body.content === undefined ? undefined : text(body.content).trim();
    const ttl = body.ttl === undefined ? undefined : integer(body.ttl);
    const priority = body.priority === undefined ? undefined : integer(body.priority);
    if (name !== undefined && (!name || !(name === zone.name || name.endsWith(`.${zone.name}`)))) throw new HttpError(400, 'record name is outside the selected zone');
    if (type !== undefined && !['A', 'AAAA', 'CNAME', 'TXT', 'MX'].includes(type)) throw new HttpError(400, 'unsupported DNS record type');
    if (content !== undefined && (!content || content.length > 4096)) throw new HttpError(400, 'invalid DNS content');
    if (ttl !== undefined && (ttl === null || (ttl !== 1 && (ttl < 60 || ttl > 86400)))) throw new HttpError(400, 'invalid DNS TTL');
    if (priority !== undefined && (priority === null || priority < 0 || priority > 65535)) throw new HttpError(400, 'invalid DNS priority');
    if (body.proxied !== undefined && typeof body.proxied !== 'boolean') throw new HttpError(400, 'proxied must be boolean');
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({ type, name, content, ttl, priority, proxied: body.proxied })) if (value !== undefined) update[key] = value;
    if (!Object.keys(update).length) throw new HttpError(400, 'no DNS fields supplied');
    const result = await cloudflare<unknown>(env, `/zones/${dnsRecord[1]}/dns_records/${dnsRecord[2]}`, { method: 'PATCH', body: JSON.stringify(update) });
    await audit(env, session, 'cf.dns.update', `${zone.name}:${dnsRecord[2]}`);
    return json(result);
  }
  if (dnsRecord && request.method === 'DELETE') {
    requireCsrf(request, session);
    const zone = await assertManagedZone(env, dnsRecord[1]!);
    const body = await readJson<{ confirmation?: string }>(request);
    requireConfirmation(body.confirmation, `DELETE ${dnsRecord[2]}`);
    const result = await cloudflare<unknown>(env, `/zones/${dnsRecord[1]}/dns_records/${dnsRecord[2]}`, { method: 'DELETE' });
    await audit(env, session, 'cf.dns.delete', `${zone.name}:${dnsRecord[2]}`);
    return json(result);
  }
  throw new HttpError(404, 'admin route not found');
}

function parseMirrorTargets(env: Env): Record<string, { origin: string; label?: string; allowCookies?: boolean; rewriteHtml?: boolean }> {
  try {
    const parsed = JSON.parse(env.MIRROR_TARGETS || '{}') as Record<string, { origin: string; label?: string; allowCookies?: boolean; rewriteHtml?: boolean }>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new HttpError(500, 'MIRROR_TARGETS is invalid JSON');
  }
}
