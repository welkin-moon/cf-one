import type { Env } from './env';

interface IncomingEmail {
  from: string;
  to: string;
  raw: ReadableStream;
  setReject(reason: string): void;
}

export async function receiveEmail(message: IncomingEmail, env: Env): Promise<void> {
  const id = crypto.randomUUID();
  const key = `mail/raw/${new Date().toISOString().slice(0, 10)}/${id}.eml`;
  await env.MEDIA.put(key, message.raw, { httpMetadata: { contentType: 'message/rfc822' } });
  await env.DB.prepare('INSERT INTO mail_messages (id, sender, recipient, raw_object_key) VALUES (?1, ?2, ?3, ?4)')
    .bind(id, message.from, message.to, key).run();
}
