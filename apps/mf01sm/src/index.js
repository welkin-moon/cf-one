const VERSION = '3.0.0';

const QUESTIONS = [
  { id: 'gf1', key: 'f', text: '如果完全不考虑他人的期待，我会更愿意让自己的外表呈现更多女性化特征。' },
  { id: 'am1', key: 'attr_m', text: '我会对某些男性产生明显的恋爱或亲密吸引。' },
  { id: 'init1', key: 'top', text: '两个人需要做决定时，我通常会自然地先提出方案并推动执行。' },
  { id: 'gm1', key: 'm', text: '如果完全不考虑他人的期待，我会更愿意让自己的外表呈现更多男性化特征。' },
  { id: 'low1', key: 'ace', text: '我很少对具体的人产生强烈的恋爱或亲密吸引。' },
  { id: 'auto1', key: 'd', text: '我希望关系中的重要边界和节奏由自己清楚掌握。' },
  { id: 'af1', key: 'attr_f', text: '我会对某些女性产生明显的恋爱或亲密吸引。' },
  { id: 'ag1', key: 'agender', text: '如果别人不把我归入男性或女性，我反而会更自在。' },
  { id: 'gf2', key: 'f', text: '当别人把我当作女性看待时，我更容易产生“这比较像我”的感觉。' },
  { id: 'am2', key: 'attr_m', text: '想象未来可能喜欢或交往的人时，男性是我自然会考虑的对象。' },
  { id: 'init2r', key: 'top', reverse: true, text: '对方先定方向、我再回应和补充，会让我更舒服。' },
  { id: 'gm2', key: 'm', text: '当别人把我当作男性看待时，我更容易产生“这比较像我”的感觉。' },
  { id: 'low2r', key: 'ace', reverse: true, text: '遇到真正喜欢的人时，我通常会明显感觉到恋爱或亲密吸引。' },
  { id: 'auto2r', key: 'd', reverse: true, text: '在充分信任的人面前，把一部分决定权交给对方会让我放松。' },
  { id: 'af2', key: 'attr_f', text: '想象未来可能喜欢或交往的人时，女性是我自然会考虑的对象。' },
  { id: 'ag2r', key: 'agender', reverse: true, text: '明确属于男性或女性中的一个类别，对我来说很重要。' },
  { id: 'gf3r', key: 'f', reverse: true, text: '如果需要长期以明显女性化的外表生活，我会觉得不自在。' },
  { id: 'am3r', key: 'attr_m', reverse: true, text: '即使某位男性很符合我的审美，我通常也不会想和他发展恋爱关系。' },
  { id: 'init3', key: 'top', text: '关系出现僵局时，我往往会主动打破沉默并推进解决。' },
  { id: 'gm3r', key: 'm', reverse: true, text: '如果需要长期以明显男性化的外表生活，我会觉得不自在。' },
  { id: 'low3', key: 'ace', text: '即使和一个人关系很亲近，我也不一定会产生恋爱或亲密吸引。' },
  { id: 'auto3', key: 'd', text: '即使关系很亲近，我也不喜欢别人替我安排重要事项。' },
  { id: 'af3r', key: 'attr_f', reverse: true, text: '即使某位女性很符合我的审美，我通常也不会想和她发展恋爱关系。' },
  { id: 'ag3', key: 'agender', text: '我常觉得只用“男性”或“女性”来描述自己并不够贴切。' },
  { id: 'gf4', key: 'f', text: '如果身体特征可以安全、自由地调整，我会倾向选择更女性化的方向。' },
  { id: 'am4', key: 'attr_m', text: '面对我喜欢的男性，我会期待被他特别关注、靠近或建立亲密关系。' },
  { id: 'init4r', key: 'top', reverse: true, text: '只要对方可靠，我愿意让对方承担更多推进关系和做决定的责任。' },
  { id: 'gm4', key: 'm', text: '如果身体特征可以安全、自由地调整，我会倾向选择更男性化的方向。' },
  { id: 'low4r', key: 'ace', reverse: true, text: '如果长期没有恋爱或亲密吸引，我会明显觉得自己的亲密关系缺少了重要部分。' },
  { id: 'auto4r', key: 'd', reverse: true, text: '对方可靠时，我能接受由对方安排一些事情，不需要事事自己控制。' },
  { id: 'af4', key: 'attr_f', text: '面对我喜欢的女性，我会期待被她特别关注、靠近或建立亲密关系。' },
  { id: 'ag4r', key: 'agender', reverse: true, text: '大多数时候，我觉得“男性/女性”二元标签能够准确描述我。' }
];

const QUESTION_JSON = JSON.stringify(QUESTIONS);

function text(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
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

async function ensureRecordsTable(env) {
  await env.mf01smsql.prepare(`CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    version TEXT,
    nickname TEXT,
    age INTEGER,
    self_gender TEXT,
    self_orientation TEXT,
    self_likert TEXT,
    location TEXT,
    ip TEXT,
    assign_gender TEXT,
    tag TEXT,
    scores TEXT,
    timestamp INTEGER
  )`).run();
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
  if (!nickname || !Number.isInteger(age) || age < 7 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const version = /^\d+\.\d+\.\d+$/.test(text(data.version, 24)) ? text(data.version, 24) : VERSION;
  const scores = data.scores && typeof data.scores === 'object' && !Array.isArray(data.scores) ? data.scores : {};
  const scoreJson = JSON.stringify(scores);
  if (scoreJson.length > 100000) return json({ error: 'scores too large' }, 413);
  const timestamp = Number.isSafeInteger(data.timestamp) && data.timestamp > 0 ? data.timestamp : Date.now();
  const id = `rec_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';
  const selfLikert = data.selfLikert && typeof data.selfLikert === 'object' && !Array.isArray(data.selfLikert) ? data.selfLikert : {};

  let d1 = false;
  let kv = false;
  try {
    await ensureRecordsTable(env);
    await env.mf01smsql.prepare(`INSERT INTO records
      (id, version, nickname, age, self_gender, self_orientation, self_likert, location, ip, assign_gender, tag, scores, timestamp)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
      .bind(id, version, nickname, age, text(data.selfGender, 80), text(data.selfOrientation, 80), JSON.stringify(selfLikert), text(data.location, 160), ip, assignGender, text(data.tag, 240), scoreJson, timestamp).run();
    d1 = true;
  } catch (error) {
    console.error('mf01sm.d1-save', error);
  }

  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version, nickname, age, gender: assignGender, ip, d1_synced: d1, timestamp }));
    kv = true;
  } catch (error) {
    console.error('mf01sm.kv-save', error);
  }

  if (!d1 && !kv) return json({ error: 'archive unavailable' }, 503);
  return json({ success: true, d1, kv, version });
}

async function readAdminData(request, env) {
  const pwd = new URL(request.url).searchParams.get('pwd') || '';
  if (!env.ADMIN || !constantTimeEqual(pwd, env.ADMIN)) return json({ error: 'Unauthorized' }, 401);
  const records = [];
  try {
    await ensureRecordsTable(env);
    const result = await env.mf01smsql.prepare('SELECT * FROM records ORDER BY timestamp DESC LIMIT 2000').all();
    for (const row of result.results || []) {
      let scores = {};
      let selfLikert = {};
      try { scores = JSON.parse(row.scores || '{}'); } catch {}
      try { selfLikert = JSON.parse(row.self_likert || '{}'); } catch {}
      records.push({ ...row, source: 'D1 SQL', scores, selfLikert });
    }
  } catch (error) {
    console.warn('mf01sm.d1-read', error);
  }
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
          source: 'KV Legacy'
        });
      } catch {}
    }
  } catch (error) {
    console.warn('mf01sm.kv-read', error);
  }
  records.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  return json(records);
}

function getAdminHtml() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>mf01sm 数据</title><style>body{margin:0;background:#111118;color:#e8e1eb;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.wrap{max-width:1500px;margin:auto;padding:24px}.login{max-width:430px;margin:18vh auto}.card{background:#211f26;border:1px solid #49454f;border-radius:18px;padding:20px}input,button{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #49454f;background:#2b2930;color:#fff}button{cursor:pointer;background:#6750a4}.table{overflow:auto;margin-top:18px}table{border-collapse:collapse;width:100%;min-width:1180px;background:#211f26}th,td{padding:10px;border-bottom:1px solid #39363d;text-align:left;vertical-align:top;font-size:12px}th{position:sticky;top:0;background:#2b2930}.tag{color:#f0a9d0;font-weight:700}.muted{color:#bdb5c2}.hidden{display:none}</style></head><body><main class="wrap"><section id="login" class="login card"><h2>mf01sm Data Logs</h2><input id="pwd" type="password" placeholder="ADMIN secret"><button id="go">Access</button><p id="msg"></p></section><section id="panel" class="hidden"><h1>数据控制台</h1><p class="muted">历史版本和 v3 数据共存；Ver 列直接来自每条记录的 version。</p><div class="table"><table><thead><tr><th>Time</th><th>Ver</th><th>Source</th><th>Nickname</th><th>Age</th><th>Location/IP</th><th>Self-ID</th><th>Self-Ori</th><th>Assign</th><th>Result</th><th>Scores</th></tr></thead><tbody id="body"></tbody></table></div></section></main><script>const esc=v=>String(v==null?'':v);document.getElementById('go').onclick=async()=>{const pwd=document.getElementById('pwd').value;const msg=document.getElementById('msg');msg.textContent='Authenticating...';try{const res=await fetch('/api/admin/data?pwd='+encodeURIComponent(pwd));if(!res.ok){msg.textContent='Access denied / '+res.status;return;}const rows=await res.json();const body=document.getElementById('body');body.replaceChildren();rows.forEach(item=>{const tr=document.createElement('tr');const sc=item.scores||{};const values=[new Date(Number(item.timestamp||0)).toLocaleString('zh-CN',{hour12:false}),item.version||'legacy',item.source||'',item.nickname||'',item.age||'',(item.location||'')+' / '+(item.ip||''),item.self_gender||'',item.self_orientation||'',item.assign_gender||'',item.tag||'',String(item.version||'').startsWith('3.')?('M:'+Math.round(sc.m||0)+' F:'+Math.round(sc.f||0)+' | 主动:'+Math.round(sc.top||0)+' 自主:'+Math.round(sc.d||0)+' | 男吸引:'+Math.round(sc.attr_m||0)+' 女吸引:'+Math.round(sc.attr_f||0)+' | 一致性:'+Math.round(sc.validity||0)):('M:'+Math.round(sc.m||0)+' F:'+Math.round(sc.f||0)+' | 1:'+Math.round(sc.top||0)+' 0:'+Math.round(sc.bot||0)+' | S:'+Math.round(sc.d||0)+' M:'+Math.round(sc.s||0)+' | 男:'+Math.round(sc.attr_m||0)+' 女:'+Math.round(sc.attr_f||0))];values.forEach((v,i)=>{const td=document.createElement('td');td.textContent=esc(v);if(i===9)td.className='tag';tr.appendChild(td);});body.appendChild(tr);});document.getElementById('login').classList.add('hidden');document.getElementById('panel').classList.remove('hidden');}catch(e){msg.textContent='Network error';}};</script></body></html>`;
}

function getMainHtml() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>认知与取向测试 · v3</title><style>:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color-scheme:dark;--bg:#121118;--card:#211f26;--card2:#2b2930;--text:#e7e1e9;--muted:#c9c2cc;--line:#4b4650;--accent:#d0bcff;--ok:#81c995;--warn:#fdd663}[data-theme="light"]{color-scheme:light;--bg:#fbf8fd;--card:#fff;--card2:#f3edf7;--text:#1d1b20;--muted:#625b71;--line:#cac4d0;--accent:#6750a4;--ok:#146c2e;--warn:#8a5d00}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);line-height:1.6}.wrap{width:min(820px,94vw);margin:auto;padding:28px 0 64px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px}.pill{display:inline-flex;padding:5px 10px;border-radius:999px;background:var(--card2);color:var(--muted);font-size:.85rem}.card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:24px;margin:14px 0;box-shadow:0 14px 35px rgba(0,0,0,.12)}h1{font-size:clamp(28px,6vw,42px);line-height:1.15;margin:.2em 0}.muted{color:var(--muted)}.note{padding:14px 16px;border-radius:14px;background:var(--card2);color:var(--muted)}.note b{color:var(--text)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.choice{border:1px solid var(--line);border-radius:14px;padding:13px 14px;cursor:pointer;background:transparent;color:var(--text);text-align:left}.choice:hover,.choice.active{border-color:var(--accent);background:var(--card2)}.choice.active{outline:1px solid var(--accent)}.likert{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.likert button{min-height:62px}.field{display:grid;gap:7px;margin:16px 0}.field label{font-weight:700}input{width:100%;min-height:50px;border-radius:13px;border:1px solid var(--line);background:var(--card2);color:var(--text);padding:10px 12px;font:inherit}.button{border:0;border-radius:999px;min-height:48px;padding:0 18px;font:inherit;font-weight:750;cursor:pointer;background:var(--accent);color:#25143d}.button.secondary{background:var(--card2);color:var(--text);border:1px solid var(--line)}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.progress{height:8px;border-radius:999px;background:var(--card2);overflow:hidden}.progress span{display:block;height:100%;background:var(--accent);width:0}.q{font-size:1.18rem;font-weight:700;margin:18px 0}.scale{display:grid;gap:9px}.scale-option{display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid var(--line);border-radius:14px;cursor:pointer}.scale-option.active{border-color:var(--accent);background:var(--card2)}.num{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--card2);font-weight:800}.scale-option.active .num{background:var(--accent);color:#25143d}.bars{display:grid;gap:10px}.barrow{display:grid;grid-template-columns:132px 1fr 42px;gap:10px;align-items:center}.bartrack{height:10px;border-radius:999px;background:var(--card2);overflow:hidden}.bartrack span{display:block;height:100%;background:var(--accent)}.result-title{font-size:clamp(22px,5vw,32px);font-weight:850;margin:8px 0 16px}.result-block{padding:14px 0;border-top:1px solid var(--line)}.quality.good{color:var(--ok)}.quality.mid{color:var(--warn)}.hidden{display:none!important}.tiny{font-size:.84rem}@media(max-width:620px){.card{padding:18px}.grid,.likert{grid-template-columns:1fr}.barrow{grid-template-columns:106px 1fr 38px}.top{align-items:flex-start}}</style></head><body data-theme="dark"><main class="wrap"><header class="top"><div><span class="pill">mf01sm · v3.0.0</span><h1>认知与取向测试</h1></div><button id="themeBtn" class="button secondary" type="button">浅色</button></header><section id="intro" class="card"><h2>开始之前</h2><p class="muted">v3 改成多题测同一方向、正反向混合和固定五级作答。结果是自我探索用的趋势描述，不是临床诊断。</p><div class="field"><label for="nickname">昵称</label><input id="nickname" maxlength="80" autocomplete="off" placeholder="例如 Observer_01"></div><div class="field"><label for="age">年龄</label><input id="age" type="number" min="7" max="90" inputmode="numeric" placeholder="7–90"></div><div class="note tiny">为了和旧版数据连续，仍保存版本号、昵称、年龄、指派性别、自我报告、结果和分数。历史 v2 记录不会被重算或覆盖。</div><div class="actions"><button id="introNext" class="button" type="button">继续</button></div></section><section id="baseline" class="card hidden"><h2>自我报告（只做统计对照）</h2><div class="note"><b>性别认同</b>：你内在如何理解自己的性别，不等于性格是否“阳刚/阴柔”。<br><b>性别表达</b>：外表、称呼或呈现方式；它不必和性别认同完全一致。<br><b>吸引方向</b>：较稳定地会被哪些对象产生恋爱或亲密吸引；“男性/女性吸引”只描述对象，不替你下身份结论。<br><b>AMAB / AFAB</b>：出生时依据身体特征被指派为男 / 女。v3 的“同/异指派性别吸引”只按这一项换算。</div><div class="field"><label>1. 你目前的性别认同更接近？</label><div class="grid" data-field="selfGender"><button class="choice" data-value="男" type="button">男</button><button class="choice" data-value="女" type="button">女</button><button class="choice" data-value="非二元/无性别/酷儿" type="button">非二元 / 无性别 / 酷儿</button><button class="choice" data-value="不确定/其他" type="button">不确定 / 其他</button></div></div><div class="field"><label>2. 你目前如何描述自己的吸引方向？</label><div class="grid" data-field="selfOrientation"><button class="choice" data-value="主要男性" type="button">主要男性</button><button class="choice" data-value="主要女性" type="button">主要女性</button><button class="choice" data-value="双向/多性别" type="button">双向 / 多性别</button><button class="choice" data-value="低或无吸引" type="button">低或无吸引</button><button class="choice" data-value="不确定/其他" type="button">不确定 / 其他</button></div></div><div class="field"><label>3. 过去较长一段时间里，你对自己的性别认同有多稳定？</label><div class="likert" data-field="q1"><button class="choice" data-value="非常稳定" type="button">非常稳定</button><button class="choice" data-value="比较稳定" type="button">比较稳定</button><button class="choice" data-value="有些变化" type="button">有些变化</button><button class="choice" data-value="变化较多" type="button">变化较多</button><button class="choice" data-value="不确定" type="button">不确定</button></div></div><div class="field"><label>4. 以出生指派性别为基准，你对“同指派性别”的人出现过恋爱或亲密吸引吗？</label><div class="muted tiny">AMAB → 男性；AFAB → 女性。</div><div class="likert" data-field="q2"><button class="choice" data-value="经常" type="button">经常</button><button class="choice" data-value="有时" type="button">有时</button><button class="choice" data-value="偶尔" type="button">偶尔</button><button class="choice" data-value="很少" type="button">很少</button><button class="choice" data-value="从不/不确定" type="button">从不 / 不确定</button></div></div><div class="field"><label>5. 以出生指派性别为基准，你对“异指派性别”的人出现过恋爱或亲密吸引吗？</label><div class="muted tiny">AMAB → 女性；AFAB → 男性。</div><div class="likert" data-field="q3"><button class="choice" data-value="经常" type="button">经常</button><button class="choice" data-value="有时" type="button">有时</button><button class="choice" data-value="偶尔" type="button">偶尔</button><button class="choice" data-value="很少" type="button">很少</button><button class="choice" data-value="从不/不确定" type="button">从不 / 不确定</button></div></div><div class="field"><label>出生指派性别（结果换算基准）</label><div class="grid" data-field="assignGender"><button class="choice" data-value="AMAB" type="button">AMAB（出生时指派为男）</button><button class="choice" data-value="AFAB" type="button">AFAB（出生时指派为女）</button></div></div><div class="actions"><button id="baselineNext" class="button" type="button">进入量表</button></div></section><section id="quiz" class="card hidden"><div class="top"><span id="qIndex" class="pill"></span><span class="muted tiny">按过去较长一段时间的一般情况作答</span></div><div class="progress"><span id="progress"></span></div><div id="question" class="q"></div><div id="scale" class="scale"></div><div class="actions"><button id="prev" class="button secondary" type="button">← 上一题</button><button id="next" class="button" type="button">下一题 →</button></div></section><section id="result" class="card hidden"><span class="pill">v3.0.0 结果</span><div id="resultTitle" class="result-title"></div><div id="analysis"></div><h3>八个方向分数</h3><div id="bars" class="bars"></div><div class="note tiny">分数是本版本内部的 0–100 标尺，不等同于人群百分位。真正的量表信度、效度和常模需要积累足够 v3 样本后再统计验证。</div><div class="actions"><button class="button secondary" type="button" onclick="location.reload()">重新测试</button></div></section></main><script>const VERSION='3.0.0';const QUESTIONS=${QUESTION_JSON};const LABELS=['非常不符合','比较不符合','不确定 / 一般','比较符合','非常符合'];const state={nickname:'',age:0,location:'Unavailable',selfGender:'',selfOrientation:'',selfLikert:{},assignGender:'',index:0,answers:Array(QUESTIONS.length).fill(null),startedAt:0};const $=s=>document.querySelector(s);const show=id=>{['intro','baseline','quiz','result'].forEach(x=>$('#'+x).classList.toggle('hidden',x!==id));};$('#themeBtn').addEventListener('click',()=>{const dark=document.body.dataset.theme==='dark';document.body.dataset.theme=dark?'light':'dark';$('#themeBtn').textContent=dark?'深色':'浅色';});document.querySelectorAll('[data-field] .choice').forEach(btn=>btn.addEventListener('click',()=>{const box=btn.closest('[data-field]');box.querySelectorAll('.choice').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const key=box.dataset.field;const value=btn.dataset.value;if(key==='selfGender'||key==='selfOrientation'||key==='assignGender')state[key]=value;else state.selfLikert[key]=value;}));$('#introNext').addEventListener('click',()=>{const name=$('#nickname').value.trim();const age=Number($('#age').value);if(!name)return alert('请输入昵称。');if(!Number.isInteger(age)||age<7||age>90)return alert('请输入 7–90 的有效年龄。');state.nickname=name;state.age=age;if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{state.location=p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6);},()=>{state.location='Denied';},{enableHighAccuracy:false,timeout:5000,maximumAge:300000});}show('baseline');});$('#baselineNext').addEventListener('click',()=>{if(!state.selfGender||!state.selfOrientation||!state.assignGender||Object.keys(state.selfLikert).length<3)return alert('请完整填写前面的统计项和出生指派性别。');state.startedAt=Date.now();show('quiz');render();});$('#prev').addEventListener('click',()=>{if(state.index>0){state.index--;render();}});$('#next').addEventListener('click',()=>{if(state.answers[state.index]===null)return alert('请选择一个程度。');if(state.index<QUESTIONS.length-1){state.index++;render();}else finish();});function render(){const q=QUESTIONS[state.index];$('#qIndex').textContent='题目 '+(state.index+1)+' / '+QUESTIONS.length;$('#progress').style.width=((state.index+1)/QUESTIONS.length*100)+'%';$('#question').textContent=q.text;const root=$('#scale');root.innerHTML='';LABELS.forEach((label,i)=>{const value=i+1;const div=document.createElement('div');div.className='scale-option'+(state.answers[state.index]===value?' active':'');div.innerHTML='<span class="num">'+value+'</span><span>'+label+'</span>';div.addEventListener('click',()=>{state.answers[state.index]=value;render();});root.appendChild(div);});$('#prev').style.visibility=state.index===0?'hidden':'visible';$('#next').textContent=state.index===QUESTIONS.length-1?'生成解析结果':'下一题 →';}function clamp(v){return Math.max(0,Math.min(100,v));}function scoreAxis(key){const vals=QUESTIONS.map((q,i)=>q.key===key?(q.reverse?6-state.answers[i]:state.answers[i]):null).filter(v=>v!==null);const mean=vals.reduce((a,b)=>a+b,0)/vals.length;return Math.round((mean-1)/4*100);}function consistencyScore(){const by={};QUESTIONS.forEach((q,i)=>{const v=q.reverse?6-state.answers[i]:state.answers[i];(by[q.key]||(by[q.key]=[])).push(v);});let diffs=[];Object.values(by).forEach(vals=>{const mean=vals.reduce((a,b)=>a+b,0)/vals.length;vals.forEach(v=>diffs.push(Math.abs(v-mean)));});const mad=diffs.reduce((a,b)=>a+b,0)/diffs.length;let score=100-mad*30;const counts=[1,2,3,4,5].map(v=>state.answers.filter(x=>x===v).length);const share=Math.max(...counts)/state.answers.length;if(share>.75)score-=(share-.75)*80;if(Date.now()-state.startedAt<30000)score-=10;return Math.round(clamp(score));}function resolve(scores){const sex=state.assignGender;const aligned=sex==='AMAB'?scores.m:scores.f;const cross=sex==='AMAB'?scores.f:scores.m;const same=sex==='AMAB'?scores.attr_m:scores.attr_f;const other=sex==='AMAB'?scores.attr_f:scores.attr_m;let identity='MIXED';if(scores.agender>=70&&scores.agender>=Math.max(scores.m,scores.f)-5)identity='AGENDER';else if(cross>=65&&cross-aligned>=15)identity='CROSS';else if(aligned>=65&&aligned-cross>=15)identity='ALIGNED';let attraction='MIXED';if(scores.ace>=70&&Math.max(scores.attr_m,scores.attr_f)<58)attraction='LOW';else if(scores.attr_m>=62&&scores.attr_f>=62&&Math.abs(scores.attr_m-scores.attr_f)<=18)attraction='BOTH';else if(same-other>=15)attraction='SAME_ASSIGNED';else if(other-same>=15)attraction='OTHER_ASSIGNED';return{identity,attraction,aligned,cross,same,other};}function resultTexts(scores,r){const sex=state.assignGender;const crossName=sex==='AMAB'?'女性方向':'男性方向';const alignedName=sex==='AMAB'?'男性方向':'女性方向';let identityTitle,identityBody;if(r.identity==='CROSS'){identityTitle='跨指派性别方向明显';identityBody='按出生指派性别 '+sex+' 换算，你的 '+crossName+' 分数明显高于 '+alignedName+'。这是量表趋势，不替你定义身份。';}else if(r.identity==='ALIGNED'){identityTitle='指派性别一致方向明显';identityBody='按出生指派性别 '+sex+' 换算，你的 '+alignedName+' 分数明显高于 '+crossName+'。';}else if(r.identity==='AGENDER'){identityTitle='弱性别化 / 无性别方向明显';identityBody='你对被固定归入男性或女性的认同较低，二元标签对你的解释力可能有限。';}else{identityTitle='性别方向混合';identityBody='男性方向与女性方向的差异没有达到 v3 的分类阈值。';}let attractionTitle,attractionBody;if(r.attraction==='SAME_ASSIGNED'){attractionTitle='同指派性别吸引更明显';attractionBody='以 '+sex+' 为基准，你对同指派性别对象的吸引分数更高。';}else if(r.attraction==='OTHER_ASSIGNED'){attractionTitle='异指派性别吸引更明显';attractionBody='以 '+sex+' 为基准，你对异指派性别对象的吸引分数更高。';}else if(r.attraction==='BOTH'){attractionTitle='双向吸引';attractionBody='男性与女性吸引分数都较高，而且彼此接近。';}else if(r.attraction==='LOW'){attractionTitle='整体吸引较低';attractionBody='低吸引方向较高，同时男性与女性吸引都没有达到本版本的高分阈值。';}else{attractionTitle='吸引方向不明显';attractionBody='男性与女性吸引分数接近，或都处于中间区间。';}const relation=scores.top>=62?'主动推进':scores.top<=38?'回应型':'协商型';return{title:identityTitle+' · '+attractionTitle+' · '+relation,identityBody,attractionBody};}async function finish(){const scores={m:scoreAxis('m'),f:scoreAxis('f'),attr_m:scoreAxis('attr_m'),attr_f:scoreAxis('attr_f'),agender:scoreAxis('agender'),ace:scoreAxis('ace'),top:scoreAxis('top'),d:scoreAxis('d')};scores.bot=100-scores.top;scores.s=100-scores.d;scores.trans=Math.round(clamp(50+((state.assignGender==='AMAB'?scores.f-scores.m:scores.m-scores.f)*.65)));scores.pan=Math.round(clamp(Math.min(scores.attr_m,scores.attr_f)-Math.abs(scores.attr_m-scores.attr_f)*.35));scores.validity=consistencyScore();scores.duration_ms=Date.now()-state.startedAt;scores._schema='assigned-sex-v3';scores._answers=Object.fromEntries(QUESTIONS.map((q,i)=>[q.id,state.answers[i]]));const r=resolve(scores);const txt=resultTexts(scores,r);$('#resultTitle').textContent=txt.title;const qualityClass=scores.validity>=75?'good':scores.validity>=55?'mid':'';$('#analysis').innerHTML='<div class="result-block"><b>性别方向</b><p>'+txt.identityBody+'</p></div><div class="result-block"><b>吸引方向</b><p>'+txt.attractionBody+'</p></div><div class="result-block"><b>关系互动</b><p>'+(scores.top>=62?'你更常主动提出方案并推动关系进程。':scores.top<=38?'你更舒服于回应、协商或让可靠的对方先推进。':'你的主动与回应倾向较均衡。')+' '+(scores.d>=62?'重要边界和决定上，你更偏向保留自主掌控。':scores.d<=38?'在充分信任的前提下，你更容易把部分决定权交给对方。':'你的自主掌控与信任交付偏好较均衡。')+'</p></div><div class="result-block"><b>作答一致性</b><p class="quality '+qualityClass+'">'+scores.validity+'/100。'+(scores.validity<55?'本次内部一致性较低，建议低置信度解读。':scores.validity<75?'一致性一般，适合看趋势。':'本次作答的一致性较好。')+'</p></div>';const bars=[['男性方向',scores.m],['女性方向',scores.f],['男性吸引',scores.attr_m],['女性吸引',scores.attr_f],['弱性别化',scores.agender],['低吸引',scores.ace],['主动推进',scores.top],['自主掌控',scores.d]];$('#bars').replaceChildren();bars.forEach(pair=>{const row=document.createElement('div');row.className='barrow';row.innerHTML='<span>'+pair[0]+'</span><span class="bartrack"><span style="width:'+pair[1]+'%"></span></span><b>'+pair[1]+'</b>';$('#bars').appendChild(row);});show('result');try{await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:VERSION,nickname:state.nickname,age:state.age,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfLikert:state.selfLikert,location:state.location,gender:state.assignGender,tag:txt.title,scores,timestamp:Date.now()})});}catch(e){console.error('Archive Failed',e);}}</script></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/save') return saveRecord(request, env);
    if (request.method === 'GET' && url.pathname === '/api/admin/data') return readAdminData(request, env);
    if (request.method === 'GET' && url.pathname === '/admin') return html(getAdminHtml());
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'not found' }, 404);
    const response = html(getMainHtml());
    return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
  }
};
