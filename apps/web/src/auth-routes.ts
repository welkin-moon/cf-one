import type { Env, Session } from './env';
import {
  assertSessionSecret,
  clearSessionCookie,
  currentSession,
  issueSession,
  openVerifier,
  randomToken,
  readSession,
  sealVerifier,
  sessionCookie,
  verifierProof
} from './auth';
import { consumeAuthChallenge, storeAuthChallenge } from './auth-challenge';
import { HttpError, json, readJson } from './http';
import { constantTimeEqual, rateLimit, requireCsrf } from './security';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: 'member' | 'admin';
  status: 'active' | 'disabled';
  credential_salt: string | null;
  credential_box: string | null;
  credential_iterations: number | null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function publicSession(session: Session | null): unknown {
  if (!session) return null;
  return {
    id: session.sub,
    email: session.email,
    role: session.role,
    owner: session.sub === 'owner',
    expiresAt: new Date(session.exp * 1000).toISOString(),
    csrf: session.csrf,
    deviceChanged: Boolean(session.deviceChanged)
  };
}

function diagnosticName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

async function findUser(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare(`SELECT id, email, display_name, role, status, credential_salt, credential_box, credential_iterations
    FROM users WHERE email = ?1`).bind(email).first<UserRow>();
}

export async function authRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path === '/api/auth/session' && request.method === 'GET') {
    return json({ session: publicSession(await currentSession(request, env)) });
  }

  if (path === '/api/auth/challenge' && request.method === 'POST') {
    assertSessionSecret(env);
    await rateLimit(request, env, 'challenge', 40, 15 * 60);
    const body = await readJson<{ email?: string }>(request);
    const email = text(body.email).trim().toLowerCase();
    if (!validEmail(email)) throw new HttpError(400, 'valid email required');
    const user = await findUser(env, email);
    if (user?.status === 'disabled') throw new HttpError(403, 'account disabled');
    const salt = user?.credential_salt ?? randomToken(16);
    const iterations = user?.credential_iterations ?? 310_000;
    const challenge = randomToken(32);
    const challengeId = randomToken(18);
    const mode = user?.credential_box ? 'login' : 'register';
    await storeAuthChallenge(env, {
      id: challengeId,
      kind: 'member',
      principal: email,
      salt,
      iterations,
      challenge,
      mode
    });
    return json({ challengeId, challenge, salt, iterations, mode });
  }

  if (path === '/api/auth/login' && request.method === 'POST') {
    assertSessionSecret(env);
    await rateLimit(request, env, 'login', 24, 15 * 60);
    const body = await readJson<{ email?: string; challengeId?: string; proof?: string; verifier?: string; inviteCode?: string; displayName?: string }>(request);
    const email = text(body.email).trim().toLowerCase();
    if (!validEmail(email)) throw new HttpError(400, 'valid email required');
    const challengeId = text(body.challengeId);
    const proof = text(body.proof);
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(challengeId) || !/^[A-Za-z0-9_-]{43}$/.test(proof)) throw new HttpError(400, 'valid login challenge required');
    const challenge = await consumeAuthChallenge(env, challengeId, 'member', email);

    let user = await findUser(env, email);
    if (user?.status === 'disabled') throw new HttpError(403, 'account disabled');
    if (user?.credential_box) {
      const verifier = await openVerifier(user.credential_box, env);
      if (!verifier || !constantTimeEqual(await verifierProof(verifier, challenge.challenge), proof)) throw new HttpError(403, 'invalid credentials');
      if (env.CREDENTIAL_SECRET && env.CREDENTIAL_SECRET.length >= 32) {
        try {
          const migratedBox = await sealVerifier(verifier, env);
          await env.DB.prepare('UPDATE users SET credential_box = ?1 WHERE id = ?2').bind(migratedBox, user.id).run();
        } catch (error) {
          console.warn('auth.credential-migration', { userId: user.id, error: diagnosticName(error) });
        }
      }
    } else {
      if (!env.INVITE_CODE) throw new HttpError(503, 'registration is disabled until INVITE_CODE is configured');
      const inviteCode = text(body.inviteCode);
      const registrationVerifier = text(body.verifier);
      if (!inviteCode || !constantTimeEqual(inviteCode, env.INVITE_CODE)) throw new HttpError(403, 'invalid invite code');
      if (!/^[A-Za-z0-9_-]{43}$/.test(registrationVerifier)) throw new HttpError(400, 'registration verifier required');
      if (!constantTimeEqual(await verifierProof(registrationVerifier, challenge.challenge), proof)) throw new HttpError(403, 'invalid registration proof');
      const credentialBox = await sealVerifier(registrationVerifier, env);
      if (!user) {
        const id = crypto.randomUUID();
        const displayName = text(body.displayName).trim().slice(0, 60) || email.split('@')[0] || email;
        await env.DB.prepare(`INSERT OR IGNORE INTO users (id, email, display_name, role, status)
          VALUES (?1, ?2, ?3, 'member', 'active')`).bind(id, email, displayName).run();
        user = await findUser(env, email);
        if (!user) throw new HttpError(500, 'account bootstrap failed');
        if (user.credential_box) throw new HttpError(409, 'account was registered concurrently; retry login');
      }
      await env.DB.prepare(`UPDATE users SET credential_salt = ?1, credential_box = ?2, credential_iterations = ?3
        WHERE id = ?4 AND status = 'active'`).bind(challenge.salt, credentialBox, challenge.iterations, user.id).run();
      user = await findUser(env, email);
    }

    if (!user || user.status !== 'active') throw new HttpError(403, 'account unavailable');
    const token = await issueSession({ id: user.id, email: user.email, role: user.role }, env, request);
    const sessionRequest = new Request(request.url, {
      headers: {
        cookie: `__Host-cf_one_session=${token}`,
        'user-agent': request.headers.get('user-agent') ?? '',
        'accept-language': request.headers.get('accept-language') ?? '',
        'sec-ch-ua': request.headers.get('sec-ch-ua') ?? '',
        'sec-ch-ua-platform': request.headers.get('sec-ch-ua-platform') ?? ''
      }
    });
    const session = await readSession(sessionRequest, env);
    if (!session) throw new HttpError(500, 'session issuance failed');

    try {
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?1').bind(user.id),
        env.DB.prepare(`INSERT INTO devices (user_id, device_hash) VALUES (?1, ?2)
          ON CONFLICT(user_id, device_hash) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP`).bind(user.id, session.device)
      ]);
    } catch (error) {
      console.warn('auth.login-side-effect', { userId: user.id, error: diagnosticName(error) });
    }

    const response = json({ ok: true, session: publicSession(session) });
    response.headers.set('set-cookie', sessionCookie(token));
    return response;
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    const session = await currentSession(request, env);
    if (session) requireCsrf(request, session);
    const response = json({ ok: true });
    response.headers.set('set-cookie', clearSessionCookie());
    return response;
  }

  return null;
}
