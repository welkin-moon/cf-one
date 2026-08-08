import type { Env, Session } from './env';
import { requireSession } from './auth';
import { HttpError, json, readJson } from './http';
import { requireCsrf } from './security';

const KINDS = new Set(['psychology', 'survey', 'quiz', 'poll']);
const STATUSES = new Set(['draft', 'published', 'closed']);

interface TestRow {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  definition_json: string;
  result_json: string;
  custom_js: string;
  created_at: number;
  updated_at: number;
  published_at: number | null;
}

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

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function publicTest(row: TestRow): Record<string, unknown> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: row.kind,
    status: row.status,
    definition: parseJson(row.definition_json, { questions: [] }),
    results: parseJson(row.result_json, []),
    hasCustomJs: Boolean(row.custom_js),
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  };
}

function ownedTest(row: TestRow): Record<string, unknown> {
  return { ...publicTest(row), customJs: row.custom_js, createdAt: row.created_at };
}

async function owned(env: Env, session: Session, id: string): Promise<TestRow> {
  const row = await env.DB.prepare('SELECT * FROM tests WHERE id = ?1 AND owner_id = ?2').bind(id, session.sub).first<TestRow>();
  if (!row) throw new HttpError(404, 'test not found');
  return row;
}

async function uniqueSlug(env: Env, wanted: string, excludeId?: string): Promise<string> {
  const base = slugify(wanted);
  for (let i = 0; i < 30; i++) {
    const candidate = i ? `${base}-${i + 1}` : base;
    const row = await env.DB.prepare('SELECT id FROM tests WHERE slug = ?1').bind(candidate).first<{ id: string }>();
    if (!row || row.id === excludeId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

async function visit(env: Env, testId: string, visitorId: string, started: boolean): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO test_visits (test_id, visitor_id, first_seen_at, last_seen_at, started)
    VALUES (?1, ?2, ?3, ?3, ?4)
    ON CONFLICT(test_id, visitor_id) DO UPDATE SET last_seen_at = excluded.last_seen_at,
      started = MAX(test_visits.started, excluded.started)`)
    .bind(testId, visitorId, now, started ? 1 : 0).run();
}

function visitorId(value: unknown): string {
  const id = typeof value === 'string' ? value : '';
  if (!/^[A-Za-z0-9_-]{8,96}$/.test(id)) throw new HttpError(400, 'invalid visitor id');
  return id;
}

export async function testStudioRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/test/')) return null;

  if (path === '/api/test/public/list' && request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT id, slug, title, description, kind, status, definition_json, result_json, custom_js,
      created_at, updated_at, published_at, owner_id FROM tests WHERE status = 'published' ORDER BY published_at DESC LIMIT 100`).all<TestRow>();
    return json({ tests: rows.results.map(publicTest) });
  }

  const publicMatch = path.match(/^\/api\/test\/public\/([A-Za-z0-9\u4e00-\u9fff-]{1,96})$/);
  if (publicMatch && request.method === 'GET') {
    const row = await env.DB.prepare(`SELECT * FROM tests WHERE slug = ?1 AND status IN ('published', 'closed')`).bind(publicMatch[1]).first<TestRow>();
    if (!row) throw new HttpError(404, 'test not found');
    const url = new URL(request.url);
    const vid = url.searchParams.get('visitor');
    if (vid) await visit(env, row.id, visitorId(vid), false);
    return json({ test: publicTest(row) });
  }

  const startMatch = path.match(/^\/api\/test\/public\/([A-Za-z0-9\u4e00-\u9fff-]{1,96})\/start$/);
  if (startMatch && request.method === 'POST') {
    const body = await readJson<{ visitorId?: unknown }>(request);
    const row = await env.DB.prepare(`SELECT id FROM tests WHERE slug = ?1 AND status = 'published'`).bind(startMatch[1]).first<{ id: string }>();
    if (!row) throw new HttpError(404, 'test not found');
    await visit(env, row.id, visitorId(body.visitorId), true);
    return json({ ok: true });
  }

  const submitMatch = path.match(/^\/api\/test\/public\/([A-Za-z0-9\u4e00-\u9fff-]{1,96})\/submit$/);
  if (submitMatch && request.method === 'POST') {
    const body = await readJson<{ visitorId?: unknown; answers?: unknown; resultKey?: unknown; score?: unknown }>(request);
    const row = await env.DB.prepare(`SELECT id, status FROM tests WHERE slug = ?1`).bind(submitMatch[1]).first<{ id: string; status: string }>();
    if (!row || row.status !== 'published') throw new HttpError(404, 'test not found');
    const vid = visitorId(body.visitorId);
    const answers = jsonText(body.answers ?? {}, 300_000);
    const resultKey = text(body.resultKey, 120);
    const score = typeof body.score === 'number' && Number.isFinite(body.score) ? body.score : null;
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO test_visits (test_id, visitor_id, first_seen_at, last_seen_at, started, completed)
        VALUES (?1, ?2, ?3, ?3, 1, 1)
        ON CONFLICT(test_id, visitor_id) DO UPDATE SET last_seen_at = excluded.last_seen_at, started = 1, completed = 1`).bind(row.id, vid, now),
      env.DB.prepare(`INSERT INTO test_responses (id, test_id, visitor_id, answers_json, result_key, score, submitted_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`).bind(crypto.randomUUID(), row.id, vid, answers, resultKey, score, now)
    ]);
    return json({ ok: true });
  }

  const customJsMatch = path.match(/^\/api\/test\/public\/([A-Za-z0-9\u4e00-\u9fff-]{1,96})\/custom-js$/);
  if (customJsMatch && request.method === 'GET') {
    const row = await env.DB.prepare(`SELECT custom_js FROM tests WHERE slug = ?1 AND status IN ('published', 'closed')`).bind(customJsMatch[1]).first<{ custom_js: string }>();
    if (!row) throw new HttpError(404, 'test not found');
    return json({ customJs: row.custom_js });
  }

  const session = await requireSession(request, env);

  if (path === '/api/test/mine' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM tests WHERE owner_id = ?1 ORDER BY updated_at DESC LIMIT 200').bind(session.sub).all<TestRow>();
    return json({ tests: rows.results.map(ownedTest) });
  }

  if (path === '/api/test' && request.method === 'POST') {
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
    const row = await owned(env, session, id);
    return json({ test: ownedTest(row) }, 201);
  }

  const itemMatch = path.match(/^\/api\/test\/([0-9a-f-]{36})$/i);
  if (itemMatch && request.method === 'GET') return json({ test: ownedTest(await owned(env, session, itemMatch[1]!)) });

  if (itemMatch && request.method === 'PATCH') {
    requireCsrf(request, session);
    const existing = await owned(env, session, itemMatch[1]!);
    const body = await readJson<Record<string, unknown>>(request);
    const title = body.title === undefined ? existing.title : text(body.title, 120);
    if (!title) throw new HttpError(400, 'title is required');
    const kind = body.kind === undefined ? existing.kind : text(body.kind, 24);
    if (!KINDS.has(kind)) throw new HttpError(400, 'invalid test kind');
    const status = body.status === undefined ? existing.status : text(body.status, 24);
    if (!STATUSES.has(status)) throw new HttpError(400, 'invalid test status');
    const slug = body.slug === undefined ? existing.slug : await uniqueSlug(env, text(body.slug, 80) || title, existing.id);
    const definition = body.definition === undefined ? existing.definition_json : jsonText(body.definition);
    const results = body.results === undefined ? existing.result_json : jsonText(body.results);
    const customJs = body.customJs === undefined ? existing.custom_js : String(body.customJs ?? '').slice(0, 100_000);
    const now = Date.now();
    const publishedAt = status === 'published' && !existing.published_at ? now : existing.published_at;
    await env.DB.prepare(`UPDATE tests SET slug=?1,title=?2,description=?3,kind=?4,status=?5,definition_json=?6,result_json=?7,custom_js=?8,updated_at=?9,published_at=?10 WHERE id=?11 AND owner_id=?12`)
      .bind(slug, title, body.description === undefined ? existing.description : text(body.description, 1000), kind, status, definition, results, customJs, now, publishedAt, existing.id, session.sub).run();
    return json({ test: ownedTest(await owned(env, session, existing.id)) });
  }

  if (itemMatch && request.method === 'DELETE') {
    requireCsrf(request, session);
    await owned(env, session, itemMatch[1]!);
    await env.DB.prepare('DELETE FROM tests WHERE id=?1 AND owner_id=?2').bind(itemMatch[1], session.sub).run();
    return json({ ok: true });
  }

  const statsMatch = path.match(/^\/api\/test\/([0-9a-f-]{36})\/stats$/i);
  if (statsMatch && request.method === 'GET') {
    const test = await owned(env, session, statsMatch[1]!);
    const [visits, responses, results, recent] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) visitors, SUM(started) started, SUM(completed) completed FROM test_visits WHERE test_id=?1`).bind(test.id).first<Record<string, number>>(),
      env.DB.prepare(`SELECT COUNT(*) responses, AVG(score) avg_score FROM test_responses WHERE test_id=?1`).bind(test.id).first<Record<string, number>>(),
      env.DB.prepare(`SELECT result_key, COUNT(*) count FROM test_responses WHERE test_id=?1 GROUP BY result_key ORDER BY count DESC LIMIT 100`).bind(test.id).all(),
      env.DB.prepare(`SELECT date(submitted_at/1000,'unixepoch') day, COUNT(*) count FROM test_responses WHERE test_id=?1 GROUP BY day ORDER BY day DESC LIMIT 30`).bind(test.id).all()
    ]);
    const questionCounts: Record<string, Record<string, number>> = {};
    const answerRows = await env.DB.prepare('SELECT answers_json FROM test_responses WHERE test_id=?1 ORDER BY submitted_at DESC LIMIT 5000').bind(test.id).all<{ answers_json: string }>();
    for (const row of answerRows.results) {
      const answers = parseJson<Record<string, unknown>>(row.answers_json, {});
      for (const [question, answer] of Object.entries(answers)) {
        if (!questionCounts[question]) questionCounts[question] = {};
        const values = Array.isArray(answer) ? answer : [answer];
        for (const value of values) {
          const key = String(value).slice(0, 200);
          questionCounts[question]![key] = (questionCounts[question]![key] ?? 0) + 1;
        }
      }
    }
    return json({
      test: ownedTest(test),
      summary: {
        visitors: Number(visits?.visitors ?? 0),
        started: Number(visits?.started ?? 0),
        completed: Number(visits?.completed ?? 0),
        responses: Number(responses?.responses ?? 0),
        averageScore: responses?.avg_score ?? null
      },
      resultDistribution: results.results,
      dailyResponses: recent.results,
      questionDistribution: questionCounts
    });
  }

  throw new HttpError(404, 'test route not found');
}
