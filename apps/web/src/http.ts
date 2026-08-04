const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
  'x-dns-prefetch-control': 'off',
  'x-frame-options': 'DENY'
};

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  const isMirror = headers.has('x-cf-one-mirror');
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (isMirror && key === 'content-security-policy') continue;
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const output = new Headers(headers);
  if (!output.has('content-type')) output.set('content-type', 'application/json; charset=utf-8');
  output.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: output });
}

export function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function readJson<T extends object>(request: Request): Promise<T> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'application/json required');
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(declaredLength) || declaredLength < 0) throw new HttpError(400, 'invalid content length');
  if (declaredLength > 1_000_000) throw new HttpError(413, 'JSON body too large');
  if (!request.body) throw new HttpError(400, 'JSON body required');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new HttpError(413, 'JSON body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new HttpError(400, 'invalid JSON body'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'JSON object required');
  return value as T;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
