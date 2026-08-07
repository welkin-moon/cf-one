import type { Env, Session } from './env';
import { isOwner, requireAdmin } from './auth';
import { HttpError, json, readJson } from './http';
import { requireCsrf } from './security';

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
}

interface ZoneResult {
  id: string;
  name: string;
  status?: string;
}

async function cloudflare<T>(env: Env, path: string, init: RequestInit = {}): Promise<CloudflareEnvelope<T>> {
  if (!env.CF_API_TOKEN) throw new HttpError(503, 'Cloudflare API access is not configured');
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
  return new Set((env.MANAGED_ZONES || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
}

async function assertManagedZone(env: Env, zoneId: string): Promise<ZoneResult> {
  if (!/^[a-f0-9]{32}$/i.test(zoneId)) throw new HttpError(400, 'invalid zone id');
  const zone = (await cloudflare<ZoneResult>(env, `/zones/${zoneId}`)).result;
  if (!managedZones(env).has(zone.name.toLowerCase())) throw new HttpError(403, 'zone is outside the managed zone scope');
  return zone;
}

async function audit(env: Env, session: Session, action: string, target: string): Promise<void> {
  await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)')
    .bind(session.sub, action, target).run();
}

function ownerOnly(session: Session): void {
  if (!isOwner(session)) throw new HttpError(403, 'site owner required');
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
      worker: 'cf-one-apex',
      owner: isOwner(session),
      bindings: { d1: Boolean(env.DB), kv: Boolean(env.CACHE), r2: Boolean(env.MEDIA), emailSend: Boolean(env.EMAIL) },
      capabilities: {
        cloudflareApiConfigured: Boolean(env.CF_API_TOKEN),
        accountConfigured: Boolean(env.CF_ACCOUNT_ID),
        managedZoneScopeConfigured: managedZones(env).size > 0,
        ownerPasswordConfigured: Boolean(env.OWNER_PASSWORD),
        sessionSigningConfigured: Boolean(env.SESSION_SECRET)
      },
      deviceBindingStrict: env.DEVICE_BINDING === 'strict'
    });
  }

  if (path === '/api/admin/users' && request.method === 'GET') {
    ownerOnly(session);
    const result = await env.DB.prepare(`SELECT id, email, display_name, role, status, created_at, last_login_at,
      CASE WHEN id = 'owner' THEN 1 ELSE 0 END AS owner
      FROM users ORDER BY owner DESC, created_at ASC LIMIT 500`).all();
    return json({ users: result.results });
  }

  const userMatch = path.match(/^\/api\/admin\/users\/([0-9A-Za-z-]{1,128})$/);
  if (userMatch && request.method === 'PATCH') {
    ownerOnly(session);
    requireCsrf(request, session);
    const userId = userMatch[1]!;
    if (userId === 'owner') throw new HttpError(403, 'owner identity cannot be modified');
    const body = await readJson<{ role?: unknown; status?: unknown }>(request);
    const updates: string[] = [];
    const values: unknown[] = [];
    if (body.role !== undefined) {
      if (body.role !== 'member' && body.role !== 'admin') throw new HttpError(400, 'role must be member or admin');
      values.push(body.role);
      updates.push(`role = ?${values.length}`);
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'disabled') throw new HttpError(400, 'status must be active or disabled');
      values.push(body.status);
      updates.push(`status = ?${values.length}`);
    }
    if (!updates.length) throw new HttpError(400, 'no user fields supplied');
    values.push(userId);
    const result = await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?${values.length}`).bind(...values).run();
    if (!result.meta.changes) throw new HttpError(404, 'user not found');
    await audit(env, session, 'user.update', userId);
    return json({ ok: true });
  }

  if (path.startsWith('/api/admin/cf/')) ownerOnly(session);

  if (path === '/api/admin/cf/zones' && request.method === 'GET') {
    const response = await cloudflare<ZoneResult[]>(env, '/zones?per_page=50');
    response.result = response.result.filter(zone => managedZones(env).has(zone.name.toLowerCase()));
    await audit(env, session, 'cf.zones.list', 'managed-zones');
    return json(response);
  }

  if (path === '/api/admin/cf/resources' && request.method === 'GET') {
    const accountId = env.CF_ACCOUNT_ID;
    if (!accountId) throw new HttpError(503, 'Cloudflare account is not configured');
    const account = encodeURIComponent(accountId);
    const [d1, kv] = await Promise.all([
      cloudflare<unknown[]>(env, `/accounts/${account}/d1/database?per_page=100`),
      cloudflare<unknown[]>(env, `/accounts/${account}/storage/kv/namespaces?per_page=100&page=1`)
    ]);
    let r2: unknown = { available: false };
    try { r2 = (await cloudflare<{ buckets?: unknown[] }>(env, `/accounts/${account}/r2/buckets`)).result; }
    catch { r2 = { available: false }; }
    await audit(env, session, 'cf.resources.list', 'account-resources');
    return json({ d1: d1.result, kv: kv.result, r2 });
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
    if (type === 'MX' && (priority === null || priority < 0 || priority > 65535)) throw new HttpError(400, 'MX priority must be 0-65535');
    if (!(name === zone.name || name.endsWith(`.${zone.name}`))) throw new HttpError(400, 'record name is outside the selected zone');
    requireConfirmation(body.confirmation, `CREATE ${name}`);
    const record: Record<string, unknown> = { type, name, content, ttl, proxied: body.proxied ?? false };
    if (type === 'MX') record.priority = priority;
    const result = await cloudflare<unknown>(env, `/zones/${dnsCollection[1]}/dns_records`, { method: 'POST', body: JSON.stringify(record) });
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
