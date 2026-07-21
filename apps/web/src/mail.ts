import type { Env, Session } from './env';
import { isCurrentAdmin, requireAdmin, requireSession } from './auth';
import { HttpError, json, readJson } from './http';
import { escapeHtml, requireCsrf } from './security';

interface IncomingEmail {
  from: string;
  to: string;
  raw: ReadableStream;
  rawSize?: number;
  setReject(reason: string): void;
}

function csv(value: string): Set<string> {
  return new Set(value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean));
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function canReadMail(session: Session, env: Env, recipient: string): boolean {
  return isCurrentAdmin(session, env) || session.email === recipient.toLowerCase();
}

export async function receiveEmail(message: IncomingEmail, env: Env): Promise<void> {
  const accepted = csv(env.MAIL_RECIPIENTS);
  if (accepted.size && !accepted.has(message.to.toLowerCase())) {
    message.setReject('Unknown recipient');
    return;
  }
  if (message.rawSize && message.rawSize > 25 * 1024 * 1024) {
    message.setReject('Message too large');
    return;
  }
  const id = crypto.randomUUID();
  const key = `mail/raw/${new Date().toISOString().slice(0, 10)}/${id}.eml`;
  await env.MEDIA.put(key, message.raw, { httpMetadata: { contentType: 'message/rfc822' } });
  await env.DB.prepare('INSERT INTO mail_messages (id, sender, recipient, raw_object_key) VALUES (?1, ?2, ?3, ?4)')
    .bind(id, message.from, message.to, key).run();
}

export async function mailRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/mail/')) return null;
  const session = await requireSession(request, env);

  if (path === '/api/mail/messages' && request.method === 'GET') {
    const result = isCurrentAdmin(session, env)
      ? await env.DB.prepare('SELECT id, sender, recipient, received_at FROM mail_messages ORDER BY received_at DESC LIMIT 100').all()
      : await env.DB.prepare('SELECT id, sender, recipient, received_at FROM mail_messages WHERE lower(recipient) = ?1 ORDER BY received_at DESC LIMIT 100').bind(session.email).all();
    return json({ messages: result.results });
  }

  const raw = path.match(/^\/api\/mail\/messages\/([^/]+)\/raw$/);
  if (raw && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT recipient, raw_object_key FROM mail_messages WHERE id = ?1').bind(raw[1]!).first<{ recipient: string; raw_object_key: string }>();
    if (!row) throw new HttpError(404, 'message not found');
    if (!canReadMail(session, env, row.recipient)) throw new HttpError(403, 'not allowed to read this message');
    const object = await env.MEDIA.get(row.raw_object_key);
    if (!object) throw new HttpError(404, 'raw message object is missing');
    return new Response(object.body, {
      headers: {
        'content-type': 'message/rfc822',
        'content-disposition': `attachment; filename="${raw[1]!}.eml"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff'
      }
    });
  }

  if (path === '/api/mail/send' && request.method === 'POST') {
    const admin = await requireAdmin(request, env);
    requireCsrf(request, admin);
    if (!env.EMAIL) throw new HttpError(503, 'Cloudflare Email Sending binding is not configured');
    const body = await readJson<{ from?: string; to?: string; subject?: string; text?: string; replyTo?: string }>(request);
    const from = text(body.from).trim().toLowerCase();
    const to = text(body.to).trim().toLowerCase();
    const subject = text(body.subject).trim();
    const messageText = text(body.text);
    const replyTo = text(body.replyTo).trim();
    const domains = csv(env.MANAGED_ZONES);
    const destinations = csv(env.EMAIL_DESTINATIONS);
    if (!validEmail(from) || !domains.has(from.split('@')[1] ?? '')) throw new HttpError(400, 'sender must use a managed domain');
    if (!validEmail(to)) throw new HttpError(400, 'valid recipient required');
    if (!destinations.has(to)) throw new HttpError(403, 'recipient is not in the verified EMAIL_DESTINATIONS allowlist');
    if (!subject || subject.length > 200 || !messageText || messageText.length > 100_000) throw new HttpError(400, 'invalid subject or message body');
    if (replyTo && !validEmail(replyTo)) throw new HttpError(400, 'invalid reply-to address');
    await env.EMAIL.send({
      from,
      to,
      subject,
      text: messageText,
      html: `<div style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(messageText)}</div>`,
      ...(replyTo ? { replyTo } : {})
    });
    await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)').bind(admin.sub, 'mail.send', `${from}->${to}`).run();
    return json({ ok: true });
  }
  throw new HttpError(404, 'mail route not found');
}
