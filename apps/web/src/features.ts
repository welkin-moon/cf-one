import type { Env, Session } from './env';
import {
  assertSessionSecret,
  clearSessionCookie,
  issueSession,
  isCurrentAdmin,
  openVerifier,
  randomToken,
  readSession,
  requireSession,
  sealVerifier,
  sessionCookie,
  verifierProof
} from './auth';
import { HttpError, json, readJson } from './http';
import { constantTimeEqual, rateLimit, requireCsrf } from './security';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: 'member' | 'admin';
  credential_salt: string | null;
  credential_box: string | null;
  credential_iterations: number | null;
}

function values(value: string): Set<string> {
  return new Set(value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean));
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function userForSession(session: Session, env: Env): Promise<UserRow> {
  const user = await env.DB.prepare('SELECT id, email, display_name, role, credential_salt, credential_box, credential_iterations FROM users WHERE id = ?1 AND email = ?2')
    .bind(session.sub, session.email).first<UserRow>();
  if (!user) throw new HttpError(401, 'account no longer exists');
  return user;
}

function publicSession(session: Session | null, env: Env): unknown {
  if (!session) return null;
  return {
    id: session.sub,
    email: session.email,
    role: isCurrentAdmin(session, env) ? 'admin' : 'member',
    expiresAt: new Date(session.exp * 1000).toISOString(),
    csrf: session.csrf,
    deviceChanged: Boolean(session.deviceChanged)
  };
}

export async function authRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path === '/api/auth/session' && request.method === 'GET') {
    return json({ session: publicSession(await readSession(request, env), env) });
  }

  if (path === '/api/auth/challenge' && request.method === 'POST') {
    assertSessionSecret(env);
    await rateLimit(request, env, 'challenge', 20, 15 * 60);
    const body = await readJson<{ email?: string }>(request);
    const email = text(body.email).trim().toLowerCase();
    if (!validEmail(email)) throw new HttpError(400, 'valid email required');
    const allowlist = values(env.USER_ALLOWLIST);
    if (allowlist.size && !allowlist.has(email)) throw new HttpError(403, 'email not allowed');
    const user = await env.DB.prepare('SELECT credential_salt, credential_box, credential_iterations FROM users WHERE email = ?1')
      .bind(email).first<Pick<UserRow, 'credential_salt' | 'credential_box' | 'credential_iterations'>>();
    const salt = user?.credential_salt ?? randomToken(16);
    const iterations = user?.credential_iterations ?? 310_000;
    const challenge = randomToken(32);
    const challengeId = randomToken(18);
    const mode = user?.credential_box ? 'login' : 'register';
    await env.CACHE.put(`auth:challenge:${challengeId}`, JSON.stringify({ email, salt, iterations, challenge, mode }), { expirationTtl: 300 });
    return json({ challengeId, challenge, salt, iterations, mode });
  }

  if (path === '/api/auth/login' && request.method === 'POST') {
    assertSessionSecret(env);
    await rateLimit(request, env, 'login', 12, 15 * 60);
    const body = await readJson<{ email?: string; challengeId?: string; proof?: string; verifier?: string; inviteCode?: string; displayName?: string }>(request);
    const email = text(body.email).trim().toLowerCase();
    if (!validEmail(email)) throw new HttpError(400, 'valid email required');
    const allowlist = values(env.USER_ALLOWLIST);
    if (allowlist.size && !allowlist.has(email)) throw new HttpError(403, 'email not allowed');
    const challengeId = text(body.challengeId);
    const proof = text(body.proof);
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(challengeId) || !/^[A-Za-z0-9_-]{43}$/.test(proof)) throw new HttpError(400, 'valid login challenge required');
    const challengeKey = `auth:challenge:${challengeId}`;
    const challengeValue = await env.CACHE.get(challengeKey);
    await env.CACHE.delete(challengeKey);
    if (!challengeValue) throw new HttpError(403, 'login challenge expired or already used');
    let challenge: { email: string; salt: string; iterations: number; challenge: string; mode: string };
    try { challenge = JSON.parse(challengeValue) as typeof challenge; }
    catch { throw new HttpError(403, 'invalid login challenge'); }
    if (challenge.email !== email) throw new HttpError(403, 'login challenge does not match account');

    const admins = values(env.ADMIN_EMAILS);
    let user = await env.DB.prepare('SELECT id, email, display_name, role, credential_salt, credential_box, credential_iterations FROM users WHERE email = ?1')
      .bind(email).first<UserRow>();
    if (user?.credential_box) {
      const verifier = await openVerifier(user.credential_box, env);
      if (!verifier || !constantTimeEqual(await verifierProof(verifier, challenge.challenge), proof)) throw new HttpError(403, 'invalid credentials');
    } else {
      const inviteCode = text(body.inviteCode);
      const registrationVerifier = text(body.verifier);
      if (!env.INVITE_CODE || !inviteCode || !constantTimeEqual(inviteCode, env.INVITE_CODE)) {
        throw new HttpError(403, user ? 'invite code required to upgrade this account' : 'invalid invite code');
      }
      if (!/^[A-Za-z0-9_-]{43}$/.test(registrationVerifier)) throw new HttpError(400, 'registration verifier required');
      if (!constantTimeEqual(await verifierProof(registrationVerifier, challenge.challenge), proof)) throw new HttpError(403, 'invalid registration proof');
      const credentialBox = await sealVerifier(registrationVerifier, env);
      if (!user) {
        const id = crypto.randomUUID();
        const role = admins.has(email) ? 'admin' : 'member';
        const displayName = text(body.displayName).trim().slice(0, 60) || email.split('@')[0] || email;
        await env.DB.prepare(`INSERT INTO users (id, email, display_name, role, credential_salt, credential_box, credential_iterations)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
          .bind(id, email, displayName, role, challenge.salt, credentialBox, challenge.iterations).run();
        user = { id, email, display_name: displayName, role, credential_salt: challenge.salt, credential_box: credentialBox, credential_iterations: challenge.iterations };
      } else {
        await env.DB.prepare('UPDATE users SET credential_salt = ?1, credential_box = ?2, credential_iterations = ?3 WHERE id = ?4')
          .bind(challenge.salt, credentialBox, challenge.iterations, user.id).run();
        user = { ...user, credential_salt: challenge.salt, credential_box: credentialBox, credential_iterations: challenge.iterations };
      }
    }

    if (!user) throw new HttpError(500, 'account bootstrap failed');
    const expectedRole: 'admin' | 'member' = admins.has(email) ? 'admin' : 'member';
    if (expectedRole !== user.role) {
      await env.DB.prepare('UPDATE users SET role = ?1 WHERE id = ?2').bind(expectedRole, user.id).run();
      user.role = expectedRole;
    }
    const token = await issueSession({ id: user.id, email: user.email, role: user.role }, env, request);
    const device = await readSession(new Request(request.url, { headers: { cookie: `cf_one_session=${token}`, 'user-agent': request.headers.get('user-agent') ?? '', 'accept-language': request.headers.get('accept-language') ?? '', 'sec-ch-ua': request.headers.get('sec-ch-ua') ?? '', 'sec-ch-ua-platform': request.headers.get('sec-ch-ua-platform') ?? '' } }), env);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?1').bind(user.id),
      env.DB.prepare(`INSERT INTO devices (user_id, device_hash) VALUES (?1, ?2)
        ON CONFLICT(user_id, device_hash) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP`).bind(user.id, device?.device ?? 'unknown')
    ]);
    const response = json({ ok: true, session: publicSession(device, env) });
    response.headers.set('set-cookie', sessionCookie(token));
    return response;
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    const session = await readSession(request, env);
    if (session) requireCsrf(request, session);
    const response = json({ ok: true });
    response.headers.set('set-cookie', clearSessionCookie());
    return response;
  }

  return null;
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): string {
  try {
    const binary = atob(value.replace(/\s+/g, ''));
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
  } catch {
    throw new HttpError(400, 'invalid UTF-8 base64 value');
  }
}

export async function toolsRoutes(request: Request, path: string): Promise<Response | null> {
  if (path === '/api/tools/uuid' && request.method === 'GET') return json({ uuid: crypto.randomUUID() });
  if (path === '/api/tools/base64' && request.method === 'POST') {
    const body = await readJson<{ operation?: 'encode' | 'decode'; value?: string }>(request);
    if (typeof body.value !== 'string' || body.value.length > 100_000) throw new HttpError(400, 'invalid value');
    if (body.operation === 'encode') return json({ value: encodeBase64(body.value) });
    if (body.operation === 'decode') return json({ value: decodeBase64(body.value) });
    throw new HttpError(400, 'operation must be encode or decode');
  }
  if (path === '/api/tools/hash' && request.method === 'POST') {
    const body = await readJson<{ value?: string }>(request);
    if (typeof body.value !== 'string' || body.value.length > 100_000) throw new HttpError(400, 'invalid value');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.value)));
    return json({ sha256: [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('') });
  }
  return null;
}

export async function chatRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/chat/')) return null;
  const session = await requireSession(request, env);
  const user = await userForSession(session, env);

  if (path === '/api/chat/rooms' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT r.id, r.name, r.owner_id, r.created_at,
      (SELECT COUNT(*) FROM room_members members WHERE members.room_id = r.id) AS member_count,
      (SELECT MAX(created_at) FROM messages latest WHERE latest.room_id = r.id) AS last_message_at
      FROM rooms r JOIN room_members membership ON membership.room_id = r.id
      WHERE membership.user_id = ?1 ORDER BY COALESCE(last_message_at, r.created_at) DESC`).bind(user.id).all();
    return json({ rooms: result.results });
  }
  if (path === '/api/chat/rooms' && request.method === 'POST') {
    requireCsrf(request, session);
    const body = await readJson<{ name?: string }>(request);
    const name = text(body.name).trim();
    if (!name || name.length > 80) throw new HttpError(400, 'room name required');
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO rooms (id, name, owner_id) VALUES (?1, ?2, ?3)').bind(id, name, user.id),
      env.DB.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?1, ?2)').bind(id, user.id)
    ]);
    return json({ id, name }, 201);
  }

  const members = path.match(/^\/api\/chat\/rooms\/([^/]+)\/members$/);
  if (members && request.method === 'GET') {
    const membership = await env.DB.prepare('SELECT 1 AS allowed FROM room_members WHERE room_id = ?1 AND user_id = ?2').bind(members[1], user.id).first();
    if (!membership) throw new HttpError(403, 'not a room member');
    const result = await env.DB.prepare(`SELECT users.id, users.email, users.display_name, room_members.joined_at,
      CASE WHEN rooms.owner_id = users.id THEN 1 ELSE 0 END AS is_owner
      FROM room_members JOIN users ON users.id = room_members.user_id JOIN rooms ON rooms.id = room_members.room_id
      WHERE room_members.room_id = ?1 ORDER BY is_owner DESC, users.display_name`).bind(members[1]).all();
    return json({ members: result.results });
  }
  if (members && request.method === 'POST') {
    requireCsrf(request, session);
    const body = await readJson<{ email?: string }>(request);
    const email = text(body.email).trim().toLowerCase();
    const room = await env.DB.prepare('SELECT owner_id FROM rooms WHERE id = ?1').bind(members[1]).first<{ owner_id: string }>();
    if (!room || room.owner_id !== user.id) throw new HttpError(403, 'room owner required');
    const invited = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first<{ id: string }>();
    if (!invited) throw new HttpError(404, 'account not found');
    await env.DB.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?1, ?2)').bind(members[1], invited.id).run();
    return json({ ok: true });
  }

  const messages = path.match(/^\/api\/chat\/rooms\/([^/]+)\/messages$/);
  if (messages && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT message.id, message.body, message.created_at, author.id AS author_id,
      author.email AS author, author.display_name AS author_name
      FROM messages message JOIN users author ON author.id = message.author_id
      WHERE message.room_id = ?1 AND EXISTS (
        SELECT 1 FROM room_members allowed WHERE allowed.room_id = message.room_id AND allowed.user_id = ?2
      ) ORDER BY message.created_at DESC LIMIT 100`).bind(messages[1], user.id).all();
    return json({ messages: result.results.reverse() });
  }
  if (messages && request.method === 'POST') {
    requireCsrf(request, session);
    const body = await readJson<{ body?: string }>(request);
    const messageText = text(body.body).trim();
    if (!messageText || messageText.length > 8000) throw new HttpError(400, 'message body required');
    const member = await env.DB.prepare('SELECT 1 AS allowed FROM room_members WHERE room_id = ?1 AND user_id = ?2').bind(messages[1], user.id).first();
    if (!member) throw new HttpError(403, 'not a room member');
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO messages (id, room_id, author_id, body) VALUES (?1, ?2, ?3, ?4)').bind(id, messages[1], user.id, messageText).run();
    return json({ id }, 201);
  }
  throw new HttpError(404, 'chat route not found');
}

export async function socialRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/social/')) return null;
  const session = await requireSession(request, env);
  const user = await userForSession(session, env);

  if (path === '/api/social/feed' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT post.id, post.body, post.visibility, post.created_at,
      author.id AS author_id, author.email AS author, author.display_name AS author_name,
      (SELECT COUNT(*) FROM post_likes likes WHERE likes.post_id = post.id) AS like_count,
      EXISTS(SELECT 1 FROM post_likes mine WHERE mine.post_id = post.id AND mine.user_id = ?1) AS liked
      FROM posts post JOIN users author ON author.id = post.author_id
      WHERE post.author_id = ?1 OR (post.visibility = 'friends' AND EXISTS (
        SELECT 1 FROM friendships friendship WHERE friendship.status = 'accepted'
          AND ((friendship.requester_id = ?1 AND friendship.addressee_id = post.author_id)
            OR (friendship.addressee_id = ?1 AND friendship.requester_id = post.author_id))
      )) ORDER BY post.created_at DESC LIMIT 100`).bind(user.id).all();
    return json({ posts: result.results });
  }
  if (path === '/api/social/posts' && request.method === 'POST') {
    requireCsrf(request, session);
    const body = await readJson<{ body?: string; visibility?: 'friends' | 'private' }>(request);
    const postText = text(body.body).trim();
    if (!postText || postText.length > 12000) throw new HttpError(400, 'post body required');
    if (body.visibility !== undefined && body.visibility !== 'friends' && body.visibility !== 'private') throw new HttpError(400, 'invalid post visibility');
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO posts (id, author_id, body, visibility) VALUES (?1, ?2, ?3, ?4)')
      .bind(id, user.id, postText, body.visibility ?? 'friends').run();
    return json({ id }, 201);
  }
  const like = path.match(/^\/api\/social\/posts\/([^/]+)\/like$/);
  if (like && request.method === 'POST') {
    requireCsrf(request, session);
    const existing = await env.DB.prepare('SELECT 1 AS liked FROM post_likes WHERE post_id = ?1 AND user_id = ?2').bind(like[1], user.id).first();
    if (existing) await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ?1 AND user_id = ?2').bind(like[1], user.id).run();
    else {
      const result = await env.DB.prepare(`INSERT INTO post_likes (post_id, user_id)
        SELECT post.id, ?2 FROM posts post WHERE post.id = ?1 AND (
          post.author_id = ?2 OR (post.visibility = 'friends' AND EXISTS (
            SELECT 1 FROM friendships friendship WHERE friendship.status = 'accepted' AND
              ((friendship.requester_id = ?2 AND friendship.addressee_id = post.author_id) OR
               (friendship.addressee_id = ?2 AND friendship.requester_id = post.author_id))
          ))
        )`).bind(like[1], user.id).run();
      if (!result.meta.changes) throw new HttpError(404, 'visible post not found');
    }
    return json({ liked: !existing });
  }

  if (path === '/api/social/friends' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT friendship.id, friendship.status, friendship.created_at,
      CASE WHEN friendship.requester_id = ?1 THEN 'outgoing' ELSE 'incoming' END AS direction,
      other.id AS user_id, other.email, other.display_name
      FROM friendships friendship JOIN users other ON other.id = CASE
        WHEN friendship.requester_id = ?1 THEN friendship.addressee_id ELSE friendship.requester_id END
      WHERE friendship.requester_id = ?1 OR friendship.addressee_id = ?1
      ORDER BY friendship.updated_at DESC`).bind(user.id).all();
    return json({ friends: result.results });
  }
  if (path === '/api/social/friends/requests' && request.method === 'POST') {
    requireCsrf(request, session);
    const body = await readJson<{ email?: string }>(request);
    const email = text(body.email).trim().toLowerCase();
    const other = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first<{ id: string }>();
    if (!other) throw new HttpError(404, 'account not found');
    if (other.id === user.id) throw new HttpError(400, 'cannot add yourself');
    const reverse = await env.DB.prepare(`SELECT id, status FROM friendships WHERE requester_id = ?1 AND addressee_id = ?2`)
      .bind(other.id, user.id).first<{ id: string; status: string }>();
    if (reverse?.status === 'pending') {
      await env.DB.prepare("UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?1").bind(reverse.id).run();
      return json({ id: reverse.id, status: 'accepted' });
    }
    if (reverse?.status === 'accepted') throw new HttpError(409, 'already friends');
    if (reverse?.status === 'blocked') throw new HttpError(403, 'friend request is blocked');
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare('INSERT INTO friendships (id, requester_id, addressee_id) VALUES (?1, ?2, ?3)').bind(id, user.id, other.id).run();
    } catch {
      throw new HttpError(409, 'friend request already exists');
    }
    return json({ id, status: 'pending' }, 201);
  }
  const accept = path.match(/^\/api\/social\/friends\/requests\/([^/]+)\/accept$/);
  if (accept && request.method === 'POST') {
    requireCsrf(request, session);
    const result = await env.DB.prepare(`UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1 AND addressee_id = ?2 AND status = 'pending'`).bind(accept[1], user.id).run();
    if (!result.meta.changes) throw new HttpError(404, 'pending request not found');
    return json({ ok: true });
  }
  throw new HttpError(404, 'social route not found');
}
