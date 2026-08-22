import { MAIN_HTML, ADMIN_HTML } from './current-pages.generated.js';

const VERSION = '4.0.5';
const MAX_BODY_CHARS = 384000;
const MAX_SCORES_CHARS = 180000;
const MAX_SELF_STATS_CHARS = 24000;

function replaceOnce(source, oldValue, newValue, label) {
  const first = source.indexOf(oldValue);
  if (first < 0) throw new Error(`mf01sm 4.0.5 patch marker missing: ${label}`);
  if (source.indexOf(oldValue, first + oldValue.length) >= 0) throw new Error(`mf01sm 4.0.5 patch marker duplicated: ${label}`);
  return source.slice(0, first) + newValue + source.slice(first + oldValue.length);
}

function patchPublicMainHtml(source) {
  let html = source;
  html = replaceOnce(html,
    'body{margin:0;background:radial-gradient(circle at 20% -20%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 42%),var(--bg);color:var(--text);min-height:100vh}.wrap{width:min(980px,calc(100% - 28px));margin:auto;padding:24px 0 56px}',
    'body{margin:0;background:radial-gradient(circle at 20% -20%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 42%),var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}.wrap{width:min(980px,calc(100% - 28px));margin:auto;padding:max(24px,env(safe-area-inset-top,0px)) 0 calc(56px + env(safe-area-inset-bottom,0px))}',
    'safe-area shell');
  html = replaceOnce(html,
    '.fun-tag{font-weight:950;font-size:clamp(1.12rem,3.4vw,1.55rem);line-height:1.4}',
    '.fun-tag{font-weight:950;font-size:clamp(1.12rem,3.4vw,1.55rem);line-height:1.4;overflow-wrap:anywhere}',
    'long result tag wrapping');
  html = replaceOnce(html,
    '.radar{width:100%;aspect-ratio:1/1;display:block;overflow:visible}.radar-grid{fill:none;stroke:color-mix(in srgb,var(--outline) 72%,transparent);stroke-width:1}.radar-spoke{stroke:color-mix(in srgb,var(--outline) 65%,transparent);stroke-width:1}.radar-leaf{fill:color-mix(in srgb,var(--accent) 24%,transparent);stroke:var(--accent);stroke-width:2.5}.radar-dot{fill:var(--accent)}.radar-label{font-size:11px;fill:var(--muted)}.radar-value{font-size:10px;fill:var(--text);font-weight:800}',
    '.radar{width:100%;aspect-ratio:460/440;display:block;overflow:visible;max-width:620px;margin-inline:auto}.radar-grid{fill:none;stroke:color-mix(in srgb,var(--outline) 72%,transparent);stroke-width:1}.radar-spoke{stroke:color-mix(in srgb,var(--outline) 65%,transparent);stroke-width:1}.radar-leaf{fill:color-mix(in srgb,var(--accent) 24%,transparent);stroke:var(--accent);stroke-width:2.5}.radar-dot{fill:var(--accent)}.radar-label{font-size:13px;fill:var(--muted)}.radar-value{font-size:11.5px;fill:var(--text);font-weight:800}',
    'radar sizing');
  html = replaceOnce(html,
    '.identity-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}',
    '.identity-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:9px}',
    'identity cards');
  html = replaceOnce(html,
    '@media(max-width:760px){.grid,.result-grid{grid-template-columns:1fr}.identity-cards{grid-template-columns:1fr 1fr 1fr}.likert{grid-template-columns:1fr}.likert .choice{justify-content:flex-start;text-align:left}.axis-list{grid-template-columns:1fr}.wrap{width:min(100% - 18px,980px);padding-top:14px}.card{border-radius:20px}.top{align-items:flex-start}}',
    '@media(max-width:760px){.grid,.result-grid{grid-template-columns:1fr}.likert{grid-template-columns:1fr}.likert .choice{justify-content:flex-start;text-align:left}.axis-list{grid-template-columns:1fr}.wrap{width:min(100% - 18px,980px);padding-top:max(14px,env(safe-area-inset-top,0px))}.card{border-radius:20px}.top{align-items:flex-start}.radar-card,.result-block{padding:14px}.axis-compare-row{grid-template-columns:minmax(92px,1.15fr) repeat(3,minmax(50px,.7fr));gap:5px;padding:8px 7px;font-size:.74rem}.axis-compare-row>*{min-width:0;overflow-wrap:anywhere}.footer-link .button{width:100%}.actions button,.actions .button{white-space:normal;text-align:center}}\n@media(max-width:430px){.wrap{width:calc(100% - 12px)}.card{padding:13px;border-radius:16px}.radar-card{padding:10px 6px 12px}.radar-label{font-size:12.5px}.radar-value{font-size:11px}.axis-compare-row{grid-template-columns:minmax(76px,1fr) repeat(3,minmax(40px,.58fr));gap:4px;padding:7px 5px;font-size:.66rem}.axis-compare-head{font-size:.64rem}.top{gap:10px}.top h1{font-size:1.5rem}.fun-tag{font-size:1.08rem}.chip{font-size:.72rem}.actions button,.actions .button{min-height:42px}}\n@media(max-height:520px) and (orientation:landscape){.wrap{padding-top:8px}.top{margin-bottom:10px}.radar{max-width:520px}}',
    'responsive breakpoints');
  html = replaceOnce(html,
    '<svg id="radar" class="radar" viewBox="0 0 400 400" role="img" aria-label="维度雷达图"></svg>',
    '<svg id="radar" class="radar" viewBox="0 0 460 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="维度雷达图"></svg>',
    'radar viewBox');
  html = replaceOnce(html,
    "function buildRadar(scores){const svg=$('#radar');svg.replaceChildren();const NS='http://www.w3.org/2000/svg',cx=200,cy=200,r=128,n=RADAR_AXES.length;const point=(i,rad)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(a)*rad,cy+Math.sin(a)*rad,a]};",
    "function buildRadar(scores){const svg=$('#radar');svg.replaceChildren();const NS='http://www.w3.org/2000/svg',cx=230,cy=220,r=128,n=RADAR_AXES.length;const point=(i,rad)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(a)*rad,cy+Math.sin(a)*rad,a]};",
    'radar center');
  html = replaceOnce(html,
    '[lx,ly]=point(i,r+36),[vx,vy]=point(i,r+20);',
    '[lx,ly]=point(i,r+38),[vx,vy]=point(i,r+21);',
    'radar label padding');
  html = replaceOnce(html,
    '  const panish = mixedAttraction && attM >= 56 && attF >= 56;\n  const alignedScore = Number(scores.gender_aligned || 0), crossScore = Number(scores.gender_cross || 0);',
    '  const panish = mixedAttraction && attM >= 56 && attF >= 56;\n  const sameSexAttraction = !aceish && !mixedAttraction && (amab ? attM > attF : attF > attM);\n  const alignedScore = Number(scores.gender_aligned || 0), crossScore = Number(scores.gender_cross || 0);',
    'same-sex flag classification');
  html = replaceOnce(html,
    '  const agender = Number(scores.nonbinary_identity || 0) >= 76 && Number(scores.nonbinary_identity || 0) >= Math.max(alignedScore, crossScore) + 8;',
    '  const agender = Number(scores.nonbinary_identity || 0) >= 76 && Number(scores.nonbinary_identity || 0) >= Math.max(alignedScore, crossScore) + 8;\n  const isLgbtqia = agender || cross || aceish || mixedAttraction || sameSexAttraction;',
    'LGBTQIA flag classification');
  html = replaceOnce(html,
    "  let flag = 'linear-gradient(135deg,#6d5dfc 0%,#e2c7ff 28%,#ffffff 50%,#ffc6dd 72%,#6dc8ff 100%)';\n  if (agender) flag = 'linear-gradient(135deg,#111 0%,#777 25%,#fff 45%,#8c63ff 72%,#f5df4d 100%)';\n  else if (cross) flag = 'linear-gradient(135deg,#5bcefa 0%,#f5a9b8 28%,#fff 50%,#f5a9b8 72%,#5bcefa 100%)';\n  else if (mixedAttraction) flag = 'linear-gradient(135deg,#d60270 0%,#9b4f96 50%,#0038a8 100%)';\n  else if (aceish) flag = 'linear-gradient(135deg,#111 0%,#9a9a9a 30%,#fff 55%,#7c3aed 100%)';\n\n  return { tag: `${left} · ${right}`, left, right, chips, flag, flags: {agender,aligned,cross,mixedAttraction,panish,aceish,smEligible} };",
    "  let flag = amab ? '#5b9cff' : '#ff8fb8';\n  let flagKind = amab ? 'cis-male-blue' : 'cis-female-pink';\n  if (agender) { flag = 'linear-gradient(180deg,#fff430 0 25%,#fff 25% 50%,#9c59d1 50% 75%,#2d2d2d 75% 100%)'; flagKind = 'nonbinary'; }\n  else if (cross) { flag = 'linear-gradient(180deg,#5bcefa 0 20%,#f5a9b8 20% 40%,#fff 40% 60%,#f5a9b8 60% 80%,#5bcefa 80% 100%)'; flagKind = 'trans'; }\n  else if (aceish) { flag = 'linear-gradient(180deg,#000 0 25%,#a3a3a3 25% 50%,#fff 50% 75%,#800080 75% 100%)'; flagKind = 'ace'; }\n  else if (mixedAttraction) { flag = 'linear-gradient(180deg,#d60270 0 40%,#9b4f96 40% 60%,#0038a8 60% 100%)'; flagKind = panish ? 'bi-pan' : 'bi-mixed'; }\n  else if (sameSexAttraction && amab) { flag = 'linear-gradient(180deg,#078d70 0 14.28%,#26ceaa 14.28% 28.56%,#98e8c1 28.56% 42.84%,#fff 42.84% 57.12%,#7bade2 57.12% 71.4%,#5049cc 71.4% 85.68%,#3d1a78 85.68% 100%)'; flagKind = 'mlm'; }\n  else if (sameSexAttraction) { flag = 'linear-gradient(180deg,#d52d00 0 14.28%,#ef7627 14.28% 28.56%,#ff9a56 28.56% 42.84%,#fff 42.84% 57.12%,#d162a4 57.12% 71.4%,#b55690 71.4% 85.68%,#a30262 85.68% 100%)'; flagKind = 'lesbian'; }\n\n  return { tag: `${left} · ${right}`, left, right, chips, flag, flagKind, flags: {agender,aligned,cross,mixedAttraction,panish,aceish,sameSexAttraction,isLgbtqia,smEligible} };",
    'result background palette');

  if (!html.includes('4.0.4')) throw new Error('mf01sm 4.0.5 expected the 4.0.4 generated presentation baseline');
  html = html.replaceAll('4.0.4', VERSION);
  for (const marker of ['viewBox="0 0 460 440"','safe-area-inset-left','@media(max-width:430px)','orientation:landscape','cis-male-blue','cis-female-pink','sameSexAttraction','mf01sm-v4-history-2','mf01sm-v4-answers-1','id="locationRetry"']) {
    if (!html.includes(marker)) throw new Error(`mf01sm 4.0.5 public marker missing: ${marker}`);
  }
  return html;
}

const PUBLIC_MAIN_HTML = patchPublicMainHtml(MAIN_HTML);

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
  if (selfLikertJson.length > MAX_SELF_STATS_CHARS) return json({ error: 'self stats too large' }, 413);
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
    if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) return request.method === 'HEAD' ? html('') : html(PUBLIC_MAIN_HTML);
    if (url.pathname === '/admin' && (request.method === 'GET' || request.method === 'HEAD')) return request.method === 'HEAD' ? html('') : html(ADMIN_HTML);
    if (url.pathname === '/api/save') return saveRecord(request, env);
    if (url.pathname === '/api/admin/data') return readAdminData(request, env);
    return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  }
};
