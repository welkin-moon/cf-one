import type { Env, Session } from './env';
import { issueSession, requireSession, sessionCookie, clearSessionCookie, readSession } from './auth';
import { HttpError, json, readJson } from './http';

function allowedEmails(env: Env): Set<string> {
  return new Set(env.USER_ALLOWLIST.split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
}

async function ensureUser(session: Session, env: Env): Promise<void> {
  await env.DB.prepare(`INSERT INTO users (id, email, display_name, role) VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(email) DO UPDATE SET role = excluded.role`).bind(session.sub, session.email, session.email.split('@')[0], session.role).run();
}

export async function authRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path === '/api/auth/session' && request.method === 'GET') return json({ session: await readSession(request, env) });
  if (path === '/api/auth/login' && request.method === 'POST') {
    const body = await readJson<{ email?: string; inviteCode?: string }>(request);
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new HttpError(400, 'valid email required');
    if (!body.inviteCode || body.inviteCode !== env.INVITE_CODE) throw new HttpError(403, 'invalid invite code');
    const allowlist = allowedEmails(env);
    if (allowlist.size && !allowlist.has(email)) throw new HttpError(403, 'email not allowed');
    const token = await issueSession(email, env, request);
    const response = json({ ok: true });
    response.headers.set('set-cookie', sessionCookie(token));
    return response;
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    const response = json({ ok: true });
    response.headers.set('set-cookie', clearSessionCookie());
    return response;
  }
  return null;
}

export async function toolsRoutes(request: Request, path: string): Promise<Response | null> {
  if (path === '/api/tools/uuid' && request.method === 'GET') return json({ uuid: crypto.randomUUID() });
  if (path === '/api/tools/base64' && request.method === 'POST') {
    const body = await readJson<{ operation?: 'encode' | 'decode'; value?: string }>(request);
    if (typeof body.value !== 'string' || body.value.length > 100_000) throw new HttpError(400, 'invalid value');
    if (body.operation === 'encode') return json({ value: btoa(unescape(encodeURIComponent(body.value))) });
    if (body.operation === 'decode') return json({ value: decodeURIComponent(escape(atob(body.value))) });
    throw new HttpError(400, 'operation must be encode or decode');
  }
  return null;
}

export async function chatRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/chat/')) return null;
  const session = await requireSession(request, env);
  await ensureUser(session, env);

  if (path === '/api/chat/rooms' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT r.id, r.name, r.created_at FROM rooms r JOIN room_members m ON m.room_id = r.id JOIN users u ON u.id = m.user_id WHERE u.email = ?1 ORDER BY r.created_at DESC`).bind(session.email).all();
    return json({ rooms: result.results });
  }
  if (path === '/api/chat/rooms' && request.method === 'POST') {
    const body = await readJson<{ name?: string }>(request);
    const name = body.name?.trim();
    if (!name || name.length > 80) throw new HttpError(400, 'room name required');
    const id = crypto.randomUUID();
    const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(session.email).first<{ id: string }>();
    if (!user) throw new HttpError(500, 'user bootstrap failed');
    await env.DB.batch([
      env.DB.prepare('INSERT INTO rooms (id, name, owner_id) VALUES (?1, ?2, ?3)').bind(id, name, user.id),
      env.DB.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?1, ?2)').bind(id, user.id)
    ]);
    return json({ id, name }, 201);
  }
  const match = path.match(/^\/api\/chat\/rooms\/([^/]+)\/messages$/);
  if (match && request.method === 'GET') {
    const roomId = match[1];
    const result = await env.DB.prepare(`SELECT m.id, m.body, m.created_at, u.email AS author FROM messages m JOIN users u ON u.id = m.author_id JOIN room_members rm ON rm.room_id = m.room_id JOIN users viewer ON viewer.id = rm.user_id WHERE m.room_id = ?1 AND viewer.email = ?2 ORDER BY m.created_at DESC LIMIT 100`).bind(roomId, session.email).all();
    return json({ messages: result.results.reverse() });
  }
  if (match && request.method === 'POST') {
    const roomId = match[1];
    const body = await readJson<{ body?: string }>(request);
    const text = body.body?.trim();
    if (!text || text.length > 8000) throw new HttpError(400, 'message body required');
    const member = await env.DB.prepare(`SELECT u.id FROM room_members rm JOIN users u ON u.id = rm.user_id WHERE rm.room_id = ?1 AND u.email = ?2`).bind(roomId, session.email).first<{ id: string }>();
    if (!member) throw new HttpError(403, 'not a room member');
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO messages (id, room_id, author_id, body) VALUES (?1, ?2, ?3, ?4)').bind(id, roomId, member.id, text).run();
    return json({ id }, 201);
  }
  throw new HttpError(404, 'chat route not found');
}

export async function socialRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/social/')) return null;
  const session = await requireSession(request, env);
  await ensureUser(session, env);
  if (path === '/api/social/feed' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT p.id, p.body, p.visibility, p.created_at, u.email AS author FROM posts p JOIN users u ON u.id = p.author_id WHERE p.visibility = 'friends' OR u.email = ?1 ORDER BY p.created_at DESC LIMIT 100`).bind(session.email).all();
    return json({ posts: result.results });
  }
  if (path === '/api/social/posts' && request.method === 'POST') {
    const body = await readJson<{ body?: string; visibility?: 'friends' | 'private' }>(request);
    const text = body.body?.trim();
    if (!text || text.length > 12000) throw new HttpError(400, 'post body required');
    const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(session.email).first<{ id: string }>();
    if (!user) throw new HttpError(500, 'user bootstrap failed');
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO posts (id, author_id, body, visibility) VALUES (?1, ?2, ?3, ?4)').bind(id, user.id, text, body.visibility ?? 'friends').run();
    return json({ id }, 201);
  }
  throw new HttpError(404, 'social route not found');
}
