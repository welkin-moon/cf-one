import { HttpError, json, readJson } from './http';

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
