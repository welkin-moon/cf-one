import type { Env, Session } from './env';
import { isOwner, randomToken, requireAdmin, requireOwner, requireSession } from './auth';
import { HttpError, json, readJson } from './http';
import { requireCsrf } from './security';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const OAUTH_REDIRECT = 'https://lunarlab.uk/api/storage/google/callback';
const ROOT_FOLDER_NAME = 'LMS Storage';
const DEFAULT_CHUNK_BYTES = 8 * 1024 * 1024;
const GOOGLE_CHUNK_UNIT = 256 * 1024;
const MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 6 * 24 * 60 * 60;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface ProviderConfigRow {
  client_id: string;
  client_secret_box: string;
}

interface ConnectionRow {
  owner_id: string;
  credential_box: string;
  folder_id: string | null;
  scope: string | null;
}

interface StoredFileRow {
  id: string;
  provider_file_id: string;
  owner_id: string;
  name: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
}

interface UploadRow {
  id: string;
  user_id: string;
  name: string;
  mime_type: string;
  total_bytes: number;
  received_bytes: number;
  session_box: string | null;
  expires_at: number;
}

interface QuotaRow {
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleFile {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  trashed?: boolean;
}

let accessCache: { credentialBox: string; token: string; expiresAt: number } | null = null;

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function base64url(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid credential box');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function storageSecrets(env: Env): string[] {
  const values: string[] = [];
  if (env.CREDENTIAL_SECRET && env.CREDENTIAL_SECRET.length >= 32) values.push(env.CREDENTIAL_SECRET);
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 32 && !values.includes(env.SESSION_SECRET)) values.push(env.SESSION_SECRET);
  if (!values.length) throw new HttpError(503, 'storage credential encryption is unavailable');
  return values;
}

async function storageKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`cf-one:storage:${secret}`));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function sealStorage(value: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buffer(iv) }, await storageKey(storageSecrets(env)[0]!), encoder.encode(value));
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

async function openStorage(box: string, env: Env): Promise<string | null> {
  const [encodedIv, encodedCiphertext] = box.split('.');
  if (!encodedIv || !encodedCiphertext) return null;
  for (const secret of storageSecrets(env)) {
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: buffer(fromBase64url(encodedIv)) },
        await storageKey(secret),
        buffer(fromBase64url(encodedCiphertext))
      );
      return decoder.decode(plaintext);
    } catch {
      // Try the migration fallback key.
    }
  }
  return null;
}

function cleanFileName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255);
}

function cleanMime(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'application/octet-stream';
  const mime = value.trim().toLowerCase().slice(0, 200);
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+*-]+$/.test(mime) ? mime : 'application/octet-stream';
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

async function providerConfig(env: Env): Promise<{ clientId: string; clientSecret: string; row: ProviderConfigRow }> {
  const row = await env.DB.prepare("SELECT client_id, client_secret_box FROM storage_provider_config WHERE provider = 'google-drive'").first<ProviderConfigRow>();
  if (!row) throw new HttpError(503, 'Google Drive OAuth is not configured; contact the site owner');
  const clientSecret = await openStorage(row.client_secret_box, env);
  if (!clientSecret) throw new HttpError(503, 'Google Drive OAuth configuration needs owner attention');
  return { clientId: row.client_id, clientSecret, row };
}

async function connection(env: Env): Promise<ConnectionRow> {
  const row = await env.DB.prepare("SELECT owner_id, credential_box, folder_id, scope FROM external_storage_connections WHERE provider = 'google-drive'").first<ConnectionRow>();
  if (!row || !row.folder_id) throw new HttpError(503, 'Google Drive is not connected; contact an administrator');
  return row;
}

async function tokenRequest(parameters: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: parameters.toString()
  });
  const body = await response.json<GoogleTokenResponse>().catch(() => ({}));
  if (!response.ok || body.error) throw new HttpError(503, 'Google Drive authorization needs administrator attention');
  return body;
}

async function accessToken(env: Env, force = false): Promise<string> {
  const conn = await connection(env);
  if (!force && accessCache && accessCache.credentialBox === conn.credential_box && accessCache.expiresAt > Date.now() + 60_000) return accessCache.token;
  const refreshToken = await openStorage(conn.credential_box, env);
  if (!refreshToken) throw new HttpError(503, 'Google Drive connection needs administrator attention');
  const config = await providerConfig(env);
  const body = await tokenRequest(new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  }));
  if (!body.access_token) throw new HttpError(503, 'Google Drive connection needs administrator attention');
  accessCache = {
    credentialBox: conn.credential_box,
    token: body.access_token,
    expiresAt: Date.now() + Math.max(60, body.expires_in ?? 3600) * 1000
  };
  env.DB.prepare("UPDATE external_storage_connections SET last_verified_at = CURRENT_TIMESTAMP WHERE provider = 'google-drive'").run().catch(() => {});
  return body.access_token;
}

async function driveFetch(env: Env, url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${await accessToken(env)}`);
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401 && retry) {
    accessCache = null;
    return driveFetch(env, url, init, false);
  }
  return response;
}

async function quota(env: Env, userId: string): Promise<QuotaRow> {
  const now = nowSeconds();
  env.DB.prepare('DELETE FROM storage_uploads WHERE expires_at < ?1').bind(now).run().catch(() => {});
  const row = await env.DB.prepare(`SELECT
      COALESCE((SELECT quota_bytes FROM user_storage_quotas WHERE user_id = ?1), default_quota_bytes) AS quota_bytes,
      COALESCE((SELECT SUM(byte_size) FROM stored_files WHERE provider = 'google-drive' AND owner_id = ?1), 0) AS used_bytes,
      COALESCE((SELECT SUM(total_bytes) FROM storage_uploads WHERE user_id = ?1 AND expires_at >= ?2), 0) AS reserved_bytes
    FROM storage_policy WHERE id = 1`).bind(userId, now).first<QuotaRow>();
  if (!row) throw new HttpError(503, 'storage policy is unavailable');
  return { quota_bytes: Number(row.quota_bytes), used_bytes: Number(row.used_bytes), reserved_bytes: Number(row.reserved_bytes) };
}

async function reserveUpload(env: Env, session: Session, id: string, name: string, mimeType: string, size: number, expiresAt: number): Promise<void> {
  const now = nowSeconds();
  const result = await env.DB.prepare(`INSERT INTO storage_uploads (id, user_id, name, mime_type, total_bytes, received_bytes, created_at, expires_at)
    SELECT ?1, ?2, ?3, ?4, ?5, 0, ?6, ?7
    WHERE ?5 +
      COALESCE((SELECT SUM(byte_size) FROM stored_files WHERE provider = 'google-drive' AND owner_id = ?2), 0) +
      COALESCE((SELECT SUM(total_bytes) FROM storage_uploads WHERE user_id = ?2 AND expires_at >= ?6), 0)
      <= COALESCE((SELECT quota_bytes FROM user_storage_quotas WHERE user_id = ?2), (SELECT default_quota_bytes FROM storage_policy WHERE id = 1))`)
    .bind(id, session.sub, name, mimeType, size, now, expiresAt).run();
  if (!result.meta.changes) throw new HttpError(409, 'storage quota exceeded; contact an administrator');
}

async function audit(env: Env, session: Session, action: string, target: string): Promise<void> {
  env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)').bind(session.sub, action, target).run().catch(() => {});
}

async function googleFailure(response: Response, operation: string): Promise<never> {
  let reason = '';
  try {
    const body = await response.json<{ error?: { status?: string; message?: string } }>();
    reason = body?.error?.status ?? '';
  } catch {
    // Keep diagnostics minimal and credential-free.
  }
  console.error('storage.google', { operation, status: response.status, reason: reason.slice(0, 80) });
  if (response.status === 401 || response.status === 403) throw new HttpError(503, 'Google Drive authorization needs administrator attention');
  if (response.status === 404) throw new HttpError(404, 'Google Drive object not found');
  throw new HttpError(502, 'Google Drive request failed; contact an administrator');
}

async function folderForConnection(env: Env, access: string): Promise<string> {
  const existing = await env.DB.prepare("SELECT folder_id FROM external_storage_connections WHERE provider = 'google-drive'").first<{ folder_id: string | null }>();
  if (existing?.folder_id) {
    const check = await fetch(`${DRIVE_API}/files/${encodeURIComponent(existing.folder_id)}?fields=id,trashed`, {
      headers: { authorization: `Bearer ${access}`, accept: 'application/json' }
    });
    if (check.ok) {
      const file = await check.json<GoogleFile>();
      if (file.id && !file.trashed) return file.id;
    }
  }
  const created = await fetch(`${DRIVE_API}/files?fields=id,name`, {
    method: 'POST',
    headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ name: ROOT_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', appProperties: { cfone: 'storage-root' } })
  });
  if (!created.ok) return googleFailure(created, 'folder.create');
  const file = await created.json<GoogleFile>();
  if (!file.id) throw new HttpError(502, 'Google Drive did not return a storage folder');
  return file.id;
}

async function storageStatus(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  const [usage, configured, connected] = await Promise.all([
    quota(env, session.sub),
    env.DB.prepare("SELECT 1 AS ok FROM storage_provider_config WHERE provider = 'google-drive'").first<{ ok: number }>(),
    env.DB.prepare("SELECT folder_id FROM external_storage_connections WHERE provider = 'google-drive'").first<{ folder_id: string | null }>()
  ]);
  return json({
    configured: Boolean(configured),
    connected: Boolean(connected?.folder_id),
    quotaBytes: usage.quota_bytes,
    usedBytes: usage.used_bytes,
    reservedBytes: usage.reserved_bytes,
    availableBytes: Math.max(0, usage.quota_bytes - usage.used_bytes - usage.reserved_bytes),
    workerRelayAvailable: true,
    googleDirectAvailable: true,
    owner: isOwner(session)
  });
}

async function saveGoogleConfig(request: Request, env: Env): Promise<Response> {
  const session = await requireOwner(request, env);
  requireCsrf(request, session);
  const body = await readJson<{ clientId?: unknown; clientSecret?: unknown }>(request);
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
  const clientSecret = typeof body.clientSecret === 'string' ? body.clientSecret.trim() : '';
  if (!/^[A-Za-z0-9._-]{20,200}\.apps\.googleusercontent\.com$/.test(clientId)) throw new HttpError(400, 'invalid Google OAuth client id');
  if (clientSecret.length < 10 || clientSecret.length > 300) throw new HttpError(400, 'invalid Google OAuth client secret');
  const secretBox = await sealStorage(clientSecret, env);
  await env.DB.prepare(`INSERT INTO storage_provider_config (provider, client_id, client_secret_box, updated_by, updated_at)
    VALUES ('google-drive', ?1, ?2, ?3, CURRENT_TIMESTAMP)
    ON CONFLICT(provider) DO UPDATE SET client_id = excluded.client_id, client_secret_box = excluded.client_secret_box,
      updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`)
    .bind(clientId, secretBox, session.sub).run();
  accessCache = null;
  await audit(env, session, 'storage.google.config', 'google-drive');
  return json({ ok: true, redirectUri: OAUTH_REDIRECT, scope: DRIVE_SCOPE });
}

async function beginGoogleConnect(request: Request, env: Env): Promise<Response> {
  const session = await requireOwner(request, env);
  requireCsrf(request, session);
  const config = await providerConfig(env);
  const state = randomToken(24);
  const now = nowSeconds();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM storage_oauth_states WHERE expires_at < ?1').bind(now),
    env.DB.prepare('INSERT INTO storage_oauth_states (state, user_id, expires_at) VALUES (?1, ?2, ?3)').bind(state, session.sub, now + OAUTH_STATE_TTL_SECONDS)
  ]);
  const url = new URL(GOOGLE_AUTH);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: OAUTH_REDIRECT,
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state
  }).toString();
  return json({ url: url.toString(), redirectUri: OAUTH_REDIRECT, scope: DRIVE_SCOPE });
}

async function googleCallback(request: Request, env: Env): Promise<Response> {
  const session = await requireOwner(request, env);
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  if (!/^[A-Za-z0-9_-]{32}$/.test(state) || !code || code.length > 4096) throw new HttpError(400, 'invalid Google OAuth callback');
  const consumed = await env.DB.prepare('DELETE FROM storage_oauth_states WHERE state = ?1 AND user_id = ?2 AND expires_at >= ?3 RETURNING state')
    .bind(state, session.sub, nowSeconds()).first<{ state: string }>();
  if (!consumed) throw new HttpError(403, 'Google OAuth state expired or already used');
  const config = await providerConfig(env);
  const token = await tokenRequest(new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: OAUTH_REDIRECT,
    grant_type: 'authorization_code'
  }));
  let refreshToken = token.refresh_token ?? null;
  if (!refreshToken) {
    const prior = await env.DB.prepare("SELECT credential_box FROM external_storage_connections WHERE provider = 'google-drive'").first<{ credential_box: string }>();
    refreshToken = prior ? await openStorage(prior.credential_box, env) : null;
  }
  if (!refreshToken || !token.access_token) throw new HttpError(503, 'Google did not issue offline access; reconnect and grant Drive access');
  const folderId = await folderForConnection(env, token.access_token);
  const credentialBox = await sealStorage(refreshToken, env);
  await env.DB.prepare(`INSERT INTO external_storage_connections (provider, owner_id, credential_box, folder_id, scope, connected_at, updated_at, last_verified_at)
    VALUES ('google-drive', ?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(provider) DO UPDATE SET owner_id = excluded.owner_id, credential_box = excluded.credential_box,
      folder_id = excluded.folder_id, scope = excluded.scope, updated_at = CURRENT_TIMESTAMP, last_verified_at = CURRENT_TIMESTAMP`)
    .bind(session.sub, credentialBox, folderId, DRIVE_SCOPE).run();
  accessCache = {
    credentialBox,
    token: token.access_token,
    expiresAt: Date.now() + Math.max(60, token.expires_in ?? 3600) * 1000
  };
  await audit(env, session, 'storage.google.connect', 'google-drive');
  return Response.redirect('https://lunarlab.uk/app/admin?drive=connected', 302);
}

async function disconnectGoogle(request: Request, env: Env): Promise<Response> {
  const session = await requireOwner(request, env);
  requireCsrf(request, session);
  const row = await env.DB.prepare("SELECT credential_box FROM external_storage_connections WHERE provider = 'google-drive'").first<{ credential_box: string }>();
  if (row) {
    const refreshToken = await openStorage(row.credential_box, env);
    if (refreshToken) fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken }).toString()
    }).catch(() => {});
  }
  await env.DB.prepare("DELETE FROM external_storage_connections WHERE provider = 'google-drive'").run();
  accessCache = null;
  await audit(env, session, 'storage.google.disconnect', 'google-drive');
  return json({ ok: true });
}

async function listFiles(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  const result = await env.DB.prepare(`SELECT id, name, mime_type, byte_size, created_at
    FROM stored_files WHERE provider = 'google-drive' AND owner_id = ?1 ORDER BY created_at DESC LIMIT 500`)
    .bind(session.sub).all();
  return json({ files: result.results });
}

async function beginUpload(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  requireCsrf(request, session);
  const body = await readJson<{ name?: unknown; mimeType?: unknown; size?: unknown }>(request);
  const name = cleanFileName(body.name);
  const mimeType = cleanMime(body.mimeType);
  const size = integer(body.size);
  if (!name) throw new HttpError(400, 'file name required');
  if (size === null || size <= 0 || size > MAX_STORAGE_BYTES) throw new HttpError(400, 'invalid file size');
  const conn = await connection(env);
  const id = crypto.randomUUID();
  const expiresAt = nowSeconds() + UPLOAD_TTL_SECONDS;
  await reserveUpload(env, session, id, name, mimeType, size, expiresAt);
  try {
    const response = await driveFetch(env, `${DRIVE_UPLOAD}/files?uploadType=resumable&fields=id,name,mimeType,size`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-upload-content-type': mimeType,
        'x-upload-content-length': String(size),
        accept: 'application/json'
      },
      body: JSON.stringify({ name, parents: [conn.folder_id], appProperties: { cfone_user: session.sub } })
    });
    if (!response.ok) return googleFailure(response, 'upload.begin');
    const sessionUrl = response.headers.get('location');
    if (!sessionUrl || !sessionUrl.startsWith('https://')) throw new HttpError(502, 'Google Drive did not create an upload session');
    await env.DB.prepare('UPDATE storage_uploads SET session_box = ?1 WHERE id = ?2 AND user_id = ?3')
      .bind(await sealStorage(sessionUrl, env), id, session.sub).run();
    return json({ uploadId: id, chunkBytes: DEFAULT_CHUNK_BYTES, totalBytes: size }, 201);
  } catch (error) {
    await env.DB.prepare('DELETE FROM storage_uploads WHERE id = ?1 AND user_id = ?2').bind(id, session.sub).run().catch(() => {});
    throw error;
  }
}

async function uploadChunk(request: Request, env: Env, uploadId: string): Promise<Response> {
  const session = await requireSession(request, env);
  requireCsrf(request, session);
  const row = await env.DB.prepare(`SELECT id, user_id, name, mime_type, total_bytes, received_bytes, session_box, expires_at
    FROM storage_uploads WHERE id = ?1 AND user_id = ?2`).bind(uploadId, session.sub).first<UploadRow>();
  if (!row) throw new HttpError(404, 'upload not found');
  if (row.expires_at < nowSeconds()) {
    await env.DB.prepare('DELETE FROM storage_uploads WHERE id = ?1').bind(row.id).run();
    throw new HttpError(409, 'upload session expired; start the upload again');
  }
  if (!row.session_box) throw new HttpError(409, 'upload session is not ready');
  const match = (request.headers.get('content-range') ?? '').match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  if (!match) throw new HttpError(400, 'valid Content-Range required');
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);
  if (![start, end, total].every(Number.isSafeInteger) || start !== row.received_bytes || total !== row.total_bytes || end < start || end >= total) {
    throw new HttpError(409, 'upload chunk is out of sequence');
  }
  const expected = end - start + 1;
  if (expected > DEFAULT_CHUNK_BYTES || (end + 1 < total && expected % GOOGLE_CHUNK_UNIT !== 0)) throw new HttpError(413, 'invalid upload chunk size');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength !== expected) throw new HttpError(400, 'upload chunk length does not match Content-Range');
  const sessionUrl = await openStorage(row.session_box, env);
  if (!sessionUrl) throw new HttpError(503, 'upload session needs administrator attention');
  const response = await driveFetch(env, sessionUrl, {
    method: 'PUT',
    redirect: 'manual',
    headers: {
      'content-type': row.mime_type,
      'content-length': String(bytes.byteLength),
      'content-range': `bytes ${start}-${end}/${total}`,
      accept: 'application/json'
    },
    body: buffer(bytes)
  });
  if (response.status === 308) {
    const accepted = response.headers.get('range')?.match(/bytes=0-(\d+)/i);
    const received = accepted ? Number(accepted[1]) + 1 : end + 1;
    await env.DB.prepare('UPDATE storage_uploads SET received_bytes = ?1 WHERE id = ?2 AND user_id = ?3')
      .bind(received, row.id, session.sub).run();
    return json({ complete: false, receivedBytes: received, totalBytes: total }, 202);
  }
  if (!response.ok) {
    if ([404, 410].includes(response.status)) await env.DB.prepare('DELETE FROM storage_uploads WHERE id = ?1').bind(row.id).run().catch(() => {});
    return googleFailure(response, 'upload.chunk');
  }
  const file = await response.json<GoogleFile>().catch(() => ({}));
  if (!file.id) throw new HttpError(502, 'Google Drive completed the upload without a file id');
  const localId = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO stored_files (id, provider, provider_file_id, owner_id, name, mime_type, byte_size)
        VALUES (?1, 'google-drive', ?2, ?3, ?4, ?5, ?6)`)
        .bind(localId, file.id, session.sub, row.name, row.mime_type, row.total_bytes),
      env.DB.prepare('DELETE FROM storage_uploads WHERE id = ?1 AND user_id = ?2').bind(row.id, session.sub)
    ]);
  } catch (error) {
    driveFetch(env, `${DRIVE_API}/files/${encodeURIComponent(file.id)}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
  return json({ complete: true, file: { id: localId, name: row.name, mimeType: row.mime_type, byteSize: row.total_bytes } }, 201);
}

async function cancelUpload(request: Request, env: Env, uploadId: string): Promise<Response> {
  const session = await requireSession(request, env);
  requireCsrf(request, session);
  const result = await env.DB.prepare('DELETE FROM storage_uploads WHERE id = ?1 AND user_id = ?2').bind(uploadId, session.sub).run();
  if (!result.meta.changes) throw new HttpError(404, 'upload not found');
  return json({ ok: true });
}

async function ownedFile(request: Request, env: Env, id: string): Promise<{ session: Session; file: StoredFileRow }> {
  const session = await requireSession(request, env);
  const file = await env.DB.prepare(`SELECT id, provider_file_id, owner_id, name, mime_type, byte_size, created_at
    FROM stored_files WHERE id = ?1 AND provider = 'google-drive' AND owner_id = ?2`).bind(id, session.sub).first<StoredFileRow>();
  if (!file) throw new HttpError(404, 'file not found');
  return { session, file };
}

function safeDisposition(name: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(name).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}

async function downloadFile(request: Request, env: Env, id: string): Promise<Response> {
  const { file } = await ownedFile(request, env, id);
  const via = new URL(request.url).searchParams.get('via') ?? 'worker';
  if (via === 'google') {
    return Response.redirect(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(file.provider_file_id)}`, 302);
  }
  if (via !== 'worker') throw new HttpError(400, 'download route must be worker or google');
  const headers = new Headers({ accept: '*/*' });
  for (const name of ['range', 'if-range', 'if-none-match', 'if-modified-since']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await driveFetch(env, `${DRIVE_API}/files/${encodeURIComponent(file.provider_file_id)}?alt=media`, { headers, redirect: 'manual' });
  if (!response.ok && response.status !== 206 && response.status !== 304) return googleFailure(response, 'download');
  const output = new Headers();
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = response.headers.get(name);
    if (value) output.set(name, value);
  }
  if (!output.has('content-type')) output.set('content-type', file.mime_type || 'application/octet-stream');
  output.set('content-disposition', safeDisposition(file.name));
  output.set('cache-control', 'private, no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: output });
}

async function deleteFile(request: Request, env: Env, id: string): Promise<Response> {
  const { session, file } = await ownedFile(request, env, id);
  requireCsrf(request, session);
  const response = await driveFetch(env, `${DRIVE_API}/files/${encodeURIComponent(file.provider_file_id)}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) return googleFailure(response, 'file.delete');
  await env.DB.prepare('DELETE FROM stored_files WHERE id = ?1 AND owner_id = ?2').bind(file.id, session.sub).run();
  await audit(env, session, 'storage.file.delete', file.id);
  return json({ ok: true });
}

async function adminQuotaList(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  const now = nowSeconds();
  env.DB.prepare('DELETE FROM storage_uploads WHERE expires_at < ?1').bind(now).run().catch(() => {});
  const result = await env.DB.prepare(`SELECT users.id, users.email, users.display_name, users.role, users.status,
      quotas.quota_bytes AS quota_override_bytes,
      COALESCE(quotas.quota_bytes, policy.default_quota_bytes) AS quota_bytes,
      COALESCE((SELECT SUM(byte_size) FROM stored_files WHERE provider = 'google-drive' AND owner_id = users.id), 0) AS used_bytes,
      COALESCE((SELECT SUM(total_bytes) FROM storage_uploads WHERE user_id = users.id AND expires_at >= ?1), 0) AS reserved_bytes
    FROM users CROSS JOIN storage_policy policy
    LEFT JOIN user_storage_quotas quotas ON quotas.user_id = users.id
    WHERE policy.id = 1 ORDER BY users.id = 'owner' DESC, users.created_at ASC LIMIT 500`).bind(now).all();
  const policy = await env.DB.prepare('SELECT default_quota_bytes FROM storage_policy WHERE id = 1').first<{ default_quota_bytes: number }>();
  return json({ defaultQuotaBytes: Number(policy?.default_quota_bytes ?? 0), users: result.results });
}

async function updateQuota(request: Request, env: Env, userId: string): Promise<Response> {
  const session = await requireAdmin(request, env);
  requireCsrf(request, session);
  const body = await readJson<{ quotaBytes?: unknown; reason?: unknown }>(request);
  const quotaBytes = integer(body.quotaBytes);
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 240) : '';
  if (quotaBytes === null || quotaBytes < 0 || quotaBytes > MAX_STORAGE_BYTES) throw new HttpError(400, 'invalid storage quota');
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?1').bind(userId).first<{ id: string }>();
  if (!user) throw new HttpError(404, 'user not found');
  const current = await quota(env, userId);
  if (quotaBytes < current.used_bytes + current.reserved_bytes) throw new HttpError(409, 'quota cannot be lower than current usage and active uploads');
  await env.DB.prepare(`INSERT INTO user_storage_quotas (user_id, quota_bytes, updated_by, reason, updated_at)
    VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET quota_bytes = excluded.quota_bytes, updated_by = excluded.updated_by,
      reason = excluded.reason, updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, quotaBytes, session.sub, reason || null).run();
  await audit(env, session, 'storage.quota.update', userId);
  return json({ ok: true, quotaBytes });
}

async function updateDefaultQuota(request: Request, env: Env): Promise<Response> {
  const session = await requireOwner(request, env);
  requireCsrf(request, session);
  const body = await readJson<{ quotaBytes?: unknown }>(request);
  const quotaBytes = integer(body.quotaBytes);
  if (quotaBytes === null || quotaBytes < 0 || quotaBytes > MAX_STORAGE_BYTES) throw new HttpError(400, 'invalid default storage quota');
  await env.DB.prepare('UPDATE storage_policy SET default_quota_bytes = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1').bind(quotaBytes).run();
  await audit(env, session, 'storage.quota.default', String(quotaBytes));
  return json({ ok: true, quotaBytes });
}

export async function storageRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/storage/')) return null;

  if (path === '/api/storage/google/callback' && request.method === 'GET') return googleCallback(request, env);
  if (path === '/api/storage/status' && request.method === 'GET') return storageStatus(request, env);
  if (path === '/api/storage/files' && request.method === 'GET') return listFiles(request, env);
  if (path === '/api/storage/uploads' && request.method === 'POST') return beginUpload(request, env);

  const upload = path.match(/^\/api\/storage\/uploads\/([0-9a-f-]{36})$/i);
  if (upload && request.method === 'PUT') return uploadChunk(request, env, upload[1]!);
  if (upload && request.method === 'DELETE') return cancelUpload(request, env, upload[1]!);

  const content = path.match(/^\/api\/storage\/files\/([0-9a-f-]{36})\/content$/i);
  if (content && request.method === 'GET') return downloadFile(request, env, content[1]!);

  const file = path.match(/^\/api\/storage\/files\/([0-9a-f-]{36})$/i);
  if (file && request.method === 'DELETE') return deleteFile(request, env, file[1]!);

  if (path === '/api/storage/admin/google/config' && request.method === 'PUT') return saveGoogleConfig(request, env);
  if (path === '/api/storage/admin/google/connect' && request.method === 'POST') return beginGoogleConnect(request, env);
  if (path === '/api/storage/admin/google/connection' && request.method === 'DELETE') return disconnectGoogle(request, env);
  if (path === '/api/storage/admin/quotas' && request.method === 'GET') return adminQuotaList(request, env);
  if (path === '/api/storage/admin/policy' && request.method === 'PATCH') return updateDefaultQuota(request, env);

  const quotaMatch = path.match(/^\/api\/storage\/admin\/quotas\/([0-9A-Za-z-]{1,128})$/);
  if (quotaMatch && request.method === 'PATCH') return updateQuota(request, env, quotaMatch[1]!);

  throw new HttpError(404, 'storage route not found');
}
