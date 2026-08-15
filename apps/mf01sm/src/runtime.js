import core from './index.js';

const VERSION = '3.1.1';

function text(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

async function saveRecord(request, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > 256000) return json({ error: 'payload too large' }, 413);

  let data;
  try { data = await request.json(); }
  catch { return json({ error: 'invalid JSON' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);

  const nickname = text(data.nickname, 80);
  const age = Number(data.age);
  const assignGender = data.gender === 'AMAB' || data.gender === 'AFAB' ? data.gender : '';
  if (!nickname || !Number.isInteger(age) || age < 13 || age > 90 || !assignGender) {
    return json({ error: 'invalid assessment metadata' }, 400);
  }

  const scores = parseObject(data.scores);
  const scoreJson = JSON.stringify(scores);
  if (scoreJson.length > 100000) return json({ error: 'scores too large' }, 413);

  const selfLikert = parseObject(data.selfLikert);
  const timestamp = Number.isSafeInteger(data.timestamp) && data.timestamp > 0 ? data.timestamp : Date.now();
  const id = `rec_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  const ip = text(request.headers.get('CF-Connecting-IP') || request.headers.get('cf-connecting-ip') || 'Unknown', 96);
  const location = text(data.location, 160) || 'Unavailable';

  // D1 is the primary archive. Do not perform a CREATE TABLE probe or a routine
  // KV mirror write for every response: both consume quota without adding data
  // value now that the historical records table is established.
  try {
    await env.mf01smsql.prepare(`INSERT INTO records
      (id, version, nickname, age, self_gender, self_orientation, self_likert, location, ip, assign_gender, tag, scores, timestamp)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
      .bind(
        id,
        VERSION,
        nickname,
        age,
        text(data.selfGender, 80),
        text(data.selfOrientation, 80),
        JSON.stringify(selfLikert),
        location,
        ip,
        assignGender,
        text(data.tag, 240),
        scoreJson,
        timestamp
      ).run();
    return json({ success: true, d1: true, kv: false, version: VERSION });
  } catch (error) {
    console.error('mf01sm.d1-save', error);
  }

  // KV is retained as a failure fallback, not a mandatory second copy. Raw IP,
  // GPS/location and the complete response_quality_detail remain in the record.
  try {
    await env.mf01sm.put(id, JSON.stringify({
      ...data,
      version: VERSION,
      nickname,
      age,
      gender: assignGender,
      location,
      ip,
      d1_synced: false,
      timestamp
    }));
    return json({ success: true, d1: false, kv: true, version: VERSION });
  } catch (error) {
    console.error('mf01sm.kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

async function readAdminData(request, env) {
  const url = new URL(request.url);
  const pwd = url.searchParams.get('pwd') || '';
  if (!env.ADMIN || !constantTimeEqual(pwd, env.ADMIN)) return json({ error: 'Unauthorized' }, 401);

  const records = [];
  let d1Available = true;
  try {
    const result = await env.mf01smsql.prepare('SELECT * FROM records ORDER BY timestamp DESC LIMIT 2000').all();
    for (const row of result.results || []) {
      let scores = {};
      let selfLikert = {};
      try { scores = JSON.parse(row.scores || '{}'); } catch {}
      try { selfLikert = JSON.parse(row.self_likert || '{}'); } catch {}
      records.push({ ...row, source: 'D1 SQL', scores, selfLikert });
    }
  } catch (error) {
    d1Available = false;
    console.warn('mf01sm.d1-read', error);
  }

  // Routine admin reads stay D1-only. KV scanning can be requested explicitly
  // for legacy/recovery work, or is used automatically if D1 is unavailable.
  const includeKv = url.searchParams.get('include_kv') === '1' || !d1Available;
  if (includeKv) {
    try {
      const listed = await env.mf01sm.list({ limit: 1000 });
      const known = new Set(records.map(row => row.id));
      for (const key of listed.keys || []) {
        if (known.has(key.name)) continue;
        const raw = await env.mf01sm.get(key.name);
        if (!raw) continue;
        try {
          const item = JSON.parse(raw);
          records.push({
            id: key.name,
            version: item.version || 'legacy',
            nickname: item.nickname,
            age: item.age,
            self_gender: item.selfGender,
            self_orientation: item.selfOrientation,
            selfLikert: item.selfLikert || {},
            location: item.location,
            ip: item.ip || 'Unknown',
            assign_gender: item.gender,
            tag: item.tag,
            scores: item.scores || {},
            timestamp: item.timestamp || 0,
            source: 'KV Legacy/Fallback'
          });
        } catch {}
      }
    } catch (error) {
      console.warn('mf01sm.kv-read', error);
    }
  }

  records.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  return json(records);
}

function patchMainHtml(source) {
  let html = source.replaceAll('3.1.0', VERSION);
  html = html.replace(
    'v3.1 不请求浏览器定位，也不保存新答卷的原始 IP。',
    '为地区统计和后续人工排除问题样本，v3.1.1 会请求浏览器定位，并保存 Cloudflare 看到的原始访问 IP；系统不会据此自动去重或自动排除答卷。'
  );
  html = html.replace("location:'Not collected'", "location:'Unavailable'");
  html = html.replace(
    "state.nickname=name;state.age=age;show('baseline');",
    "state.nickname=name;state.age=age;if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{state.location=p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6);},()=>{state.location='Denied';},{enableHighAccuracy:false,timeout:5000,maximumAge:300000});}show('baseline');"
  );
  return html;
}

function patchAdminHtml(source) {
  return source.replace(
    "+' | 质量:'+Math.round(sc.response_quality||0);",
    "+' | 质量:'+Math.round(sc.response_quality||0)+' 注:'+Math.round((sc.response_quality_detail||{}).attention_passed||0)+'/'+Math.round((sc.response_quality_detail||{}).attention_total||0)+' 平行:'+Math.round((sc.response_quality_detail||{}).pair_score||0)+' 速:'+Math.round((sc.response_quality_detail||{}).ms_per_item||0)+'ms/题';"
  );
}

async function patchedCoreResponse(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const url = new URL(request.url);
  if (url.pathname !== '/' && url.pathname !== '/admin') return response;

  const original = await response.text();
  const body = url.pathname === '/admin' ? patchAdminHtml(original) : patchMainHtml(original);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/save') return saveRecord(request, env);
    if (url.pathname === '/api/admin/data') return readAdminData(request, env);
    return patchedCoreResponse(request, env, ctx);
  }
};
