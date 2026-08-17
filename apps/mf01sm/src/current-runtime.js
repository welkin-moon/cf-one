import { MAIN_HTML, ADMIN_HTML } from './current-pages.generated.js';

const VERSION = '4.0.0';
const MAX_BODY_CHARS = 384000;
const MAX_SCORES_CHARS = 180000;

function text(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function html(body) {
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
function constantTimeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return diff === 0;
}
function parseObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function normalizedVersion(value) {
  const candidate = text(value, 24);
  return /^\d+\.\d+\.\d+$/.test(candidate) ? candidate : VERSION;
}
function normalizedAge(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

async function saveRecord(request, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_CHARS) return json({ error: 'payload too large' }, 413);
  let raw;
  try { raw = await request.text(); } catch { return json({ error: 'invalid body' }, 400); }
  if (raw.length > MAX_BODY_CHARS) return json({ error: 'payload too large' }, 413);
  let data;
  try { data = JSON.parse(raw); } catch { return json({ error: 'invalid JSON' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);

  // v4 keeps UI/business validation on the client so historical/imported records can still be archived.
  // Storage normalizes and bounds every persisted field, but deliberately does not reject by age range.
  const version = normalizedVersion(data.version);
  const nickname = text(data.nickname, 80);
  const age = normalizedAge(data.age);
  const assignGender = text(data.gender, 16);
  const scores = parseObject(data.scores);
  const scoreJson = JSON.stringify(scores);
  if (scoreJson.length > MAX_SCORES_CHARS) return json({ error: 'scores too large' }, 413);
  const selfLikert = parseObject(data.selfLikert);
  const selfLikertJson = JSON.stringify(selfLikert);
  const timestamp = Number.isSafeInteger(data.timestamp) && data.timestamp > 0 ? data.timestamp : Date.now();
  const id = `rec_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  const ip = text(request.headers.get('CF-Connecting-IP') || request.headers.get('cf-connecting-ip') || 'Unknown', 96);
  const location = text(data.location, 160) || 'Unavailable';

  try {
    await env.mf01smsql.prepare(`INSERT INTO records
      (id, version, nickname, age, self_gender, self_orientation, self_likert, location, ip, assign_gender, tag, scores, timestamp)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
      .bind(id, version, nickname, age, text(data.selfGender, 80), text(data.selfOrientation, 80), selfLikertJson, location, ip, assignGender, text(data.tag, 240), scoreJson, timestamp).run();
    return json({ success: true, d1: true, kv: false, version });
  } catch (error) {
    console.error('mf01sm.v4-d1-save', error);
  }

  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version, nickname, age, gender: assignGender, location, ip, d1_synced: false, timestamp }));
    return json({ success: true, d1: false, kv: true, version });
  } catch (error) {
    console.error('mf01sm.v4-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

async function readAdminData(request, env) {
  if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);
  const url = new URL(request.url);
  const pwd = url.searchParams.get('pwd') || '';
  if (!env.ADMIN || !constantTimeEqual(pwd, env.ADMIN)) return json({ error: 'Unauthorized' }, 401);
  const records = [];
  let d1Available = true;
  try {
    const result = await env.mf01smsql.prepare('SELECT * FROM records ORDER BY timestamp DESC LIMIT 2000').all();
    for (const row of result.results || []) {
      let scores = {}, selfLikert = {};
      try { scores = JSON.parse(row.scores || '{}'); } catch {}
      try { selfLikert = JSON.parse(row.self_likert || '{}'); } catch {}
      records.push({ ...row, source: 'D1 SQL', scores, selfLikert });
    }
  } catch (error) {
    d1Available = false;
    console.warn('mf01sm.v4-d1-read', error);
  }
  const includeKv = url.searchParams.get('include_kv') === '1' || !d1Available;
  if (includeKv) {
    try {
      const listed = await env.mf01sm.list({ limit: 1000 });
      const known = new Set(records.map(row => row.id));
      for (const key of listed.keys || []) {
        if (known.has(key.name)) continue;
        const rawValue = await env.mf01sm.get(key.name);
        if (!rawValue) continue;
        try {
          const item = JSON.parse(rawValue);
          records.push({
            id: key.name, version: item.version || 'legacy', nickname: item.nickname, age: item.age,
            self_gender: item.selfGender, self_orientation: item.selfOrientation, selfLikert: item.selfLikert || {},
            location: item.location, ip: item.ip || 'Unknown', assign_gender: item.gender, tag: item.tag,
            scores: item.scores || {}, timestamp: item.timestamp || 0, source: 'KV Legacy/Fallback'
          });
        } catch {}
      }
    } catch (error) {
      console.warn('mf01sm.v4-kv-read', error);
    }
  }
  records.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  return json(records);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) return request.method === 'HEAD' ? html('') : html(MAIN_HTML);
    if (url.pathname === '/admin' && (request.method === 'GET' || request.method === 'HEAD')) return request.method === 'HEAD' ? html('') : html(ADMIN_HTML);
    if (url.pathname === '/api/save') return saveRecord(request, env);
    if (url.pathname === '/api/admin/data') return readAdminData(request, env);
    return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  }
};
