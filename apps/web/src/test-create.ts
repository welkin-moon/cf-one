import type { Env } from './env';
import { requireSession } from './auth';
import { HttpError, json, readJson } from './http';
import { requireCsrf } from './security';

const KINDS = new Set(['psychology', 'survey', 'quiz', 'poll']);

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function jsonText(value: unknown, max = 200_000): string {
  const output = JSON.stringify(value ?? null);
  if (output.length > max) throw new HttpError(413, 'test definition is too large');
  return output;
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return slug || `test-${crypto.randomUUID().slice(0, 8)}`;
}

async function uniqueSlug(env: Env, wanted: string): Promise<string> {
  const base = slugify(wanted);
  for (let i = 0; i < 30; i++) {
    const candidate = i ? `${base}-${i + 1}` : base;
    const row = await env.DB.prepare('SELECT id FROM tests WHERE slug = ?1').bind(candidate).first<{ id: string }>();
    if (!row) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function createTestRoute(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path !== '/api/test' || request.method !== 'POST') return null;
  const session = await requireSession(request, env);
  requireCsrf(request, session);
  const body = await readJson<{ title?: unknown; description?: unknown; kind?: unknown; slug?: unknown; definition?: unknown; results?: unknown; customJs?: unknown }>(request);
  const title = text(body.title, 120);
  if (!title) throw new HttpError(400, 'title is required');
  const kind = text(body.kind, 24) || 'survey';
  if (!KINDS.has(kind)) throw new HttpError(400, 'invalid test kind');
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(env, text(body.slug, 80) || title);
  const now = Date.now();
  const customJs = typeof body.customJs === 'string' ? body.customJs.slice(0, 100_000) : '';
  await env.DB.prepare(`INSERT INTO tests (id, owner_id, slug, title, description, kind, status, definition_json, result_json, custom_js, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'draft', ?7, ?8, ?9, ?10, ?10)`)
    .bind(id, session.sub, slug, title, text(body.description, 1000), kind, jsonText(body.definition ?? { questions: [] }), jsonText(body.results ?? []), customJs, now).run();
  return json({ test: { id, slug, title, description: text(body.description, 1000), kind, status: 'draft', definition: body.definition ?? { questions: [] }, results: body.results ?? [], customJs, createdAt: now, updatedAt: now, publishedAt: null } }, 201);
}
