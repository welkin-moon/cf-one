import type { Env, Session } from './env';
import { isOwner, requireAdmin } from './auth';
import { HttpError, json, readJson } from './http';
import { requireCsrf } from './security';
import { invitationCodeHash, newInvitationCode } from './invitations';

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

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function createBoundInvite(env: Env, session: Session, email: string, note: string, expiresInDays: number): Promise<{ id: string; code: string; expiresAt: number }> {
  const code = newInvitationCode();
  const id = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInDays * 86400;
  await env.DB.prepare(`INSERT INTO invitation_codes
    (id, code_hash, code_prefix, note, created_by, max_uses, expires_at, bound_email)
    VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)`)
    .bind(id, await invitationCodeHash(code), code.slice(0, 12), note, session.sub, expiresAt, email.toLowerCase()).run();
  return { id, code, expiresAt };
}

async function manageableUser(env: Env, session: Session, userId: string): Promise<{ id: string; email: string; role: 'member' | 'admin'; deleted_at: string | null }> {
  if (userId === 'owner' || userId === session.sub) throw new HttpError(403, 'this account cannot be managed here');
  const target = await env.DB.prepare('SELECT id, email, role, deleted_at FROM users WHERE id = ?1')
    .bind(userId).first<{ id: string; email: string; role: 'member' | 'admin'; deleted_at: string | null }>();
  if (!target) throw new HttpError(404, 'user not found');
  if (target.deleted_at) throw new HttpError(409, 'deleted account cannot be modified');
  if (!isOwner(session) && target.role === 'admin') throw new HttpError(403, 'site owner required to modify administrators');
  return target;
}

async function softDeleteUser(env: Env, userId: string): Promise<void> {
  const tombstoneEmail = `deleted+${userId.toLowerCase()}@invalid.local`;
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET email = ?1, display_name = '已删除用户', username = NULL, role = 'member',
      status = 'disabled', credential_salt = NULL, credential_box = NULL, credential_iterations = NULL,
      must_change_password = 0, session_epoch = session_epoch + 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?2`).bind(tombstoneEmail, userId),
    env.DB.prepare('DELETE FROM devices WHERE user_id = ?1').bind(userId)
  ]);
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

  if (path === '/api/admin/invites' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT i.id, i.code_prefix, i.note, i.max_uses, i.use_count, i.expires_at,
      i.status, i.created_at, i.last_used_at, u.display_name AS created_by_name, u.email AS created_by_email
      FROM invitation_codes i
      LEFT JOIN users u ON u.id = i.created_by
      ORDER BY i.created_at DESC LIMIT 500`).all();
    return json({ invites: result.results });
  }

  if (path === '/api/admin/invites' && request.method === 'POST') {
    requireCsrf(request, session);
    const body = await readJson<{ note?: unknown; maxUses?: unknown; expiresInDays?: unknown }>(request);
    const note = text(body.note).trim().slice(0, 160);
    const maxUses = body.maxUses === undefined ? 1 : integer(body.maxUses);
    const expiresInDays = body.expiresInDays === undefined ? 7 : integer(body.expiresInDays);
    if (maxUses === null || maxUses < 1 || maxUses > 10000) throw new HttpError(400, 'max uses must be 1-10000');
    if (expiresInDays === null || expiresInDays < 0 || expiresInDays > 3650) throw new HttpError(400, 'expiry must be 0-3650 days');
    const code = newInvitationCode();
    const id = crypto.randomUUID();
    const expiresAt = expiresInDays === 0 ? null : Math.floor(Date.now() / 1000) + expiresInDays * 86400;
    await env.DB.prepare(`INSERT INTO invitation_codes
      (id, code_hash, code_prefix, note, created_by, max_uses, expires_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
      .bind(id, await invitationCodeHash(code), code.slice(0, 12), note, session.sub, maxUses, expiresAt).run();
    await audit(env, session, 'invite.create', id);
    return json({ invite: { id, code, codePrefix: code.slice(0, 12), note, maxUses, useCount: 0, expiresAt, status: 'active' } }, 201);
  }

  const inviteUsesMatch = path.match(/^\/api\/admin\/invites\/([0-9a-f-]{36})\/uses$/i);
  if (inviteUsesMatch && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT x.id, x.email, x.used_at, u.display_name, u.id AS user_id
      FROM invitation_uses x
      LEFT JOIN users u ON u.id = x.user_id
      WHERE x.invite_id = ?1
      ORDER BY x.used_at DESC LIMIT 500`).bind(inviteUsesMatch[1]!).all();
    return json({ uses: result.results });
  }

  const inviteMatch = path.match(/^\/api\/admin\/invites\/([0-9a-f-]{36})$/i);
  if (inviteMatch && request.method === 'PATCH') {
    requireCsrf(request, session);
    const body = await readJson<{ status?: unknown; note?: unknown; maxUses?: unknown }>(request);
    const current = await env.DB.prepare('SELECT use_count FROM invitation_codes WHERE id = ?1').bind(inviteMatch[1]!).first<{ use_count: number }>();
    if (!current) throw new HttpError(404, 'invite not found');
    const updates: string[] = [];
    const values: unknown[] = [];
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'revoked') throw new HttpError(400, 'invalid invite status');
      values.push(body.status);
      updates.push(`status = ?${values.length}`);
    }
    if (body.note !== undefined) {
      values.push(text(body.note).trim().slice(0, 160));
      updates.push(`note = ?${values.length}`);
    }
    if (body.maxUses !== undefined) {
      const maxUses = integer(body.maxUses);
      if (maxUses === null || maxUses < current.use_count || maxUses < 1 || maxUses > 10000) throw new HttpError(400, 'max uses is invalid');
      values.push(maxUses);
      updates.push(`max_uses = ?${values.length}`);
    }
    if (!updates.length) throw new HttpError(400, 'no invite fields supplied');
    values.push(inviteMatch[1]!);
    await env.DB.prepare(`UPDATE invitation_codes SET ${updates.join(', ')} WHERE id = ?${values.length}`).bind(...values).run();
    await audit(env, session, 'invite.update', inviteMatch[1]!);
    return json({ ok: true });
  }

  if (inviteMatch && request.method === 'DELETE') {
    requireCsrf(request, session);
    const current = await env.DB.prepare('SELECT use_count FROM invitation_codes WHERE id = ?1').bind(inviteMatch[1]!).first<{ use_count: number }>();
    if (!current) throw new HttpError(404, 'invite not found');
    if (current.use_count > 0) throw new HttpError(409, 'invite has usage history; revoke it instead');
    await env.DB.prepare('DELETE FROM invitation_codes WHERE id = ?1').bind(inviteMatch[1]!).run();
    await audit(env, session, 'invite.delete', inviteMatch[1]!);
    return json({ ok: true });
  }

  if (path === '/api/admin/users' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT id, email, display_name, role, status, created_at, last_login_at, deleted_at,
      CASE WHEN id = 'owner' THEN 1 ELSE 0 END AS owner
      FROM users ORDER BY owner DESC, deleted_at IS NOT NULL, created_at ASC LIMIT 500`).all();
    return json({ users: result.results });
  }

  const userMatch = path.match(/^\/api\/admin\/users\/([0-9A-Za-z-]{1,128})$/);
  if (userMatch && request.method === 'PATCH') {
    requireCsrf(request, session);
    const userId = userMatch[1]!;
    if (userId === 'owner') throw new HttpError(403, 'owner identity cannot be modified');
    if (!isOwner(session) && userId === session.sub) throw new HttpError(403, 'administrators cannot modify their own account');
    const target = await env.DB.prepare('SELECT role, deleted_at FROM users WHERE id = ?1').bind(userId).first<{ role: 'member' | 'admin'; deleted_at: string | null }>();
    if (!target) throw new HttpError(404, 'user not found');
    if (target.deleted_at) throw new HttpError(409, 'deleted account cannot be modified');
    const body = await readJson<{ role?: unknown; status?: unknown; displayName?: unknown }>(request);
    if (!isOwner(session) && (target.role === 'admin' || body.role !== undefined)) throw new HttpError(403, 'site owner required to modify administrators');
    const updates: string[] = [];
    const values: unknown[] = [];
    if (body.displayName !== undefined) {
      const displayName = text(body.displayName).trim();
      if (!displayName || displayName.length > 60) throw new HttpError(400, 'display name must be 1-60 characters');
      values.push(displayName);
      updates.push(`display_name = ?${values.length}`);
    }
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
    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?${values.length}`).bind(...values).run();
    await audit(env, session, 'user.update', userId);
    return json({ ok: true });
  }

  if (userMatch && request.method === 'DELETE') {
    requireCsrf(request, session);
    ownerOnly(session);
    const userId = userMatch[1]!;
    if (userId === 'owner' || userId === session.sub) throw new HttpError(403, 'owner identity cannot be deleted');
    const target = await env.DB.prepare('SELECT id, deleted_at FROM users WHERE id = ?1').bind(userId).first<{ id: string; deleted_at: string | null }>();
    if (!target) throw new HttpError(404, 'user not found');
    if (target.deleted_at) return json({ ok: true });
    const tombstoneEmail = `deleted+${userId.toLowerCase()}@invalid.local`;
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET email = ?1, display_name = '已删除用户', username = NULL, role = 'member',
        status = 'disabled', credential_salt = NULL, credential_box = NULL, credential_iterations = NULL,
        must_change_password = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ?2`).bind(tombstoneEmail, userId),
      env.DB.prepare('DELETE FROM devices WHERE user_id = ?1').bind(userId)
    ]);
    await audit(env, session, 'user.delete', userId);
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
