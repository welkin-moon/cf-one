const VERSION = '3.1.0';

const QUESTIONS = [
  { id: 'ga1', key: 'gender_aligned', pair: 'ga', text: '别人把我当作出生指派性别时，这通常和我的自我感觉是一致的。' },
  { id: 'rm1', key: 'rom_m', pair: 'rm', text: '想象可能的恋爱对象时，男性会自然进入我的考虑范围。' },
  { id: 'init1', key: 'initiative', pair: 'init', text: '两个人需要决定下一步时，我通常会主动提出方案并推动事情继续。' },
  { id: 'gc1', key: 'gender_cross', pair: 'gc', text: '如果别人自然地把我当作与出生指派性别不同的一侧，我会更接近“这才像我”的感觉。' },
  { id: 'rf1', key: 'rom_f', pair: 'rf', text: '想象可能的恋爱对象时，女性会自然进入我的考虑范围。' },
  { id: 'aut1', key: 'autonomy', text: '关系中的重要边界和决定，我通常希望自己保留明确的决定权。' },
  { id: 'nb1', key: 'nonbinary', pair: 'nb', text: '只用“男性”或“女性”二选一来描述我，常常会遗漏重要的一部分。' },
  { id: 'pm1', key: 'phys_m', pair: 'pm', text: '我会对某些男性产生明显的身体或性吸引，而不只是欣赏外表。' },
  { id: 'ga2', key: 'gender_aligned', text: '如果身体的性别特征可以安全、自由地调整，我会愿意让它们保持或更接近出生指派性别的方向。' },
  { id: 'pf1', key: 'phys_f', pair: 'pf', text: '我会对某些女性产生明显的身体或性吸引，而不只是欣赏外表。' },
  { id: 'gc2', key: 'gender_cross', text: '如果身体的性别特征可以安全、自由地调整，我会希望其中一些朝与出生指派性别不同的方向发展。' },
  { id: 'check1', attention: 4, text: '这是一个作答质量检查题。为了确认你在阅读题目，请选择“比较符合”。' },
  { id: 'rm2', key: 'rom_m', text: '当某位男性让我很心动时，我会期待得到他的特别关注，并有发展恋爱关系的可能。' },
  { id: 'nb2', key: 'nonbinary', text: '允许自己不必固定在单一的男性或女性类别里，会让我更自在。' },
  { id: 'rf2', key: 'rom_f', text: '当某位女性让我很心动时，我会期待得到她的特别关注，并有发展恋爱关系的可能。' },
  { id: 'init2', key: 'initiative', text: '关系出现僵局时，我通常会先采取行动，让沟通或安排重新推进。' },
  { id: 'ga3', key: 'gender_aligned', text: '想象几年后的自己时，继续以出生指派性别生活对我来说会比较自然。' },
  { id: 'aut2', key: 'autonomy', pair: 'aut', text: '即使很信任对方，我也倾向于自己参与决定会显著影响我的事情。' },
  { id: 'gc3', key: 'gender_cross', text: '想象几年后的自己时，以与出生指派性别不同的性别生活会让我觉得更自然。' },
  { id: 'pm2', key: 'phys_m', pair: 'pm', text: '如果一位男性很符合我的偏好，我可能会希望和他有身体或性层面的亲近。' },
  { id: 'rf3', key: 'rom_f', pair: 'rf', text: '如果一位女性很符合我的偏好，我可能会希望和她发展带有恋爱意味的亲密关系。' },
  { id: 'nb3', key: 'nonbinary', text: '我的性别体验有时更像是在二元分类之外，而不是简单地落在男或女的一端。' },
  { id: 'pf2', key: 'phys_f', pair: 'pf', text: '如果一位女性很符合我的偏好，我可能会希望和她有身体或性层面的亲近。' },
  { id: 'rm3', key: 'rom_m', pair: 'rm', text: '如果一位男性很符合我的偏好，我可能会希望和他发展带有恋爱意味的亲密关系。' },
  { id: 'pm3', key: 'phys_m', text: '看到某些符合我偏好的男性时，我会出现想和他有更亲近身体接触的吸引感。' },
  { id: 'init3', key: 'initiative', text: '在共同计划里，我经常是先把模糊想法变成具体安排的人。' },
  { id: 'check2', attention: 2, text: '这是第二个作答质量检查题。请在这一题选择“比较不符合”。' },
  { id: 'ga4', key: 'gender_aligned', pair: 'ga', text: '即使完全没有外界期待，我仍愿意长期以出生指派性别被别人理解。' },
  { id: 'pf3', key: 'phys_f', text: '看到某些符合我偏好的女性时，我会出现想和她有更亲近身体接触的吸引感。' },
  { id: 'aut3', key: 'autonomy', pair: 'aut', text: '当一件事主要影响我本人时，我更舒服于自己掌握最终决定，而不是完全交给对方。' },
  { id: 'gc4', key: 'gender_cross', pair: 'gc', text: '即使完全没有外界期待，我仍会希望自己的称呼或性别呈现更接近与出生指派性别不同的一侧。' },
  { id: 'nb4', key: 'nonbinary', pair: 'nb', text: '当别人允许我不被固定归入男性或女性中的单一类别时，我通常会更放松。' },
  { id: 'init4', key: 'initiative', pair: 'init', text: '如果两个人都在等待，我往往会先迈出一步，把关系或计划往前带。' },
  { id: 'aut4', key: 'autonomy', text: '亲密关系越重要，我越希望双方协商，而不是让一方长期替另一方做决定。' }
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
  if (!nickname || !Number.isInteger(age) || age < 13 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const version = /^\d+\.\d+\.\d+$/.test(text(data.version, 24)) ? text(data.version, 24) : VERSION;
  const scores = data.scores && typeof data.scores === 'object' && !Array.isArray(data.scores) ? data.scores : {};
  const scoreJson = JSON.stringify(scores);
  if (scoreJson.length > 100000) return json({ error: 'scores too large' }, 413);
  const timestamp = Number.isSafeInteger(data.timestamp) && data.timestamp > 0 ? data.timestamp : Date.now();
  const id = `rec_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  const ip = 'Not collected';
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
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>mf01sm 数据</title><style>body{margin:0;background:#111118;color:#e8e1eb;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.wrap{max-width:1600px;margin:auto;padding:24px}.login{max-width:430px;margin:18vh auto}.card{background:#211f26;border:1px solid #49454f;border-radius:18px;padding:20px}input,button{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #49454f;background:#2b2930;color:#fff}button{cursor:pointer;background:#6750a4}.table{overflow:auto;margin-top:18px}table{border-collapse:collapse;width:100%;min-width:1320px;background:#211f26}th,td{padding:10px;border-bottom:1px solid #39363d;text-align:left;vertical-align:top;font-size:12px}th{position:sticky;top:0;background:#2b2930}.tag{color:#f0a9d0;font-weight:700}.muted{color:#bdb5c2}.hidden{display:none}</style></head><body><main class="wrap"><section id="login" class="login card"><h2>mf01sm Data Logs</h2><input id="pwd" type="password" placeholder="ADMIN secret"><button id="go">Access</button><p id="msg"></p></section><section id="panel" class="hidden"><h1>数据控制台</h1><p class="muted">历史版本继续原样保留。v3.1 起把浪漫吸引与身体/性吸引分开；Ver 列直接来自每条记录的 version。</p><div class="table"><table><thead><tr><th>Time</th><th>Ver</th><th>Source</th><th>Nickname</th><th>Age</th><th>Location/IP</th><th>Self-ID</th><th>Self-Ori</th><th>Assign</th><th>Result</th><th>Scores</th></tr></thead><tbody id="body"></tbody></table></div></section></main><script>const esc=v=>String(v==null?'':v);document.getElementById('go').onclick=async()=>{const pwd=document.getElementById('pwd').value;const msg=document.getElementById('msg');msg.textContent='Authenticating...';try{const res=await fetch('/api/admin/data?pwd='+encodeURIComponent(pwd));if(!res.ok){msg.textContent='Access denied / '+res.status;return;}const rows=await res.json();const body=document.getElementById('body');body.replaceChildren();rows.forEach(item=>{const tr=document.createElement('tr');const sc=item.scores||{};let scoreText;if(String(item.version||'').startsWith('3.1')){scoreText='一致:'+Math.round(sc.gender_aligned||0)+' 跨:'+Math.round(sc.gender_cross||0)+' NB:'+Math.round(sc.nonbinary||0)+' | 浪M:'+Math.round(sc.rom_m||0)+' 浪F:'+Math.round(sc.rom_f||0)+' 身M:'+Math.round(sc.phys_m||0)+' 身F:'+Math.round(sc.phys_f||0)+' | 主动:'+Math.round(sc.initiative||0)+' 自主:'+Math.round(sc.autonomy||0)+' | 质量:'+Math.round(sc.response_quality||0);}else if(String(item.version||'').startsWith('3.')){scoreText='M:'+Math.round(sc.m||0)+' F:'+Math.round(sc.f||0)+' | 主动:'+Math.round(sc.top||0)+' 自主:'+Math.round(sc.d||0)+' | 男吸引:'+Math.round(sc.attr_m||0)+' 女吸引:'+Math.round(sc.attr_f||0)+' | 一致性:'+Math.round(sc.validity||0);}else{scoreText='M:'+Math.round(sc.m||0)+' F:'+Math.round(sc.f||0)+' | 1:'+Math.round(sc.top||0)+' 0:'+Math.round(sc.bot||0)+' | S:'+Math.round(sc.d||0)+' M:'+Math.round(sc.s||0)+' | 男:'+Math.round(sc.attr_m||0)+' 女:'+Math.round(sc.attr_f||0);}const values=[new Date(Number(item.timestamp||0)).toLocaleString('zh-CN',{hour12:false}),item.version||'legacy',item.source||'',item.nickname||'',item.age||'',(item.location||'')+' / '+(item.ip||''),item.self_gender||'',item.self_orientation||'',item.assign_gender||'',item.tag||'',scoreText];values.forEach((v,i)=>{const td=document.createElement('td');td.textContent=esc(v);if(i===9)td.className='tag';tr.appendChild(td);});body.appendChild(tr);});document.getElementById('login').classList.add('hidden');document.getElementById('panel').classList.remove('hidden');}catch(e){msg.textContent='Network error';}};</script></body></html>`;
}

function getMainHtml() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>认知与取向测试 · v3.1</title><style>:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color-scheme:dark;--bg:#121118;--card:#211f26;--card2:#2b2930;--text:#e7e1e9;--muted:#c9c2cc;--line:#4b4650;--accent:#d0bcff;--ok:#81c995;--warn:#fdd663;--bad:#ffb4ab}[data-theme="light"]{color-scheme:light;--bg:#fbf8fd;--card:#fff;--card2:#f3edf7;--text:#1d1b20;--muted:#625b71;--line:#cac4d0;--accent:#6750a4;--ok:#146c2e;--warn:#8a5d00;--bad:#b3261e}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);line-height:1.6}.wrap{width:min(840px,94vw);margin:auto;padding:28px 0 64px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px}.pill{display:inline-flex;padding:5px 10px;border-radius:999px;background:var(--card2);color:var(--muted);font-size:.85rem}.card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:24px;margin:14px 0;box-shadow:0 14px 35px rgba(0,0,0,.12)}h1{font-size:clamp(28px,6vw,42px);line-height:1.15;margin:.2em 0}.muted{color:var(--muted)}.note{padding:14px 16px;border-radius:14px;background:var(--card2);color:var(--muted)}.note b{color:var(--text)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.choice{border:1px solid var(--line);border-radius:14px;padding:13px 14px;cursor:pointer;background:transparent;color:var(--text);text-align:left}.choice:hover,.choice.active{border-color:var(--accent);background:var(--card2)}.choice.active{outline:1px solid var(--accent)}.likert{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.likert button{min-height:62px}.field{display:grid;gap:7px;margin:16px 0}.field label{font-weight:700}input{width:100%;min-height:50px;border-radius:13px;border:1px solid var(--line);background:var(--card2);color:var(--text);padding:10px 12px;font:inherit}.button{border:0;border-radius:999px;min-height:48px;padding:0 18px;font:inherit;font-weight:750;cursor:pointer;background:var(--accent);color:#25143d}.button.secondary{background:var(--card2);color:var(--text);border:1px solid var(--line)}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.progress{height:8px;border-radius:999px;background:var(--card2);overflow:hidden}.progress span{display:block;height:100%;background:var(--accent);width:0}.q{font-size:1.18rem;font-weight:700;margin:18px 0}.scale{display:grid;gap:9px}.scale-option{display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid var(--line);border-radius:14px;cursor:pointer}.scale-option.active{border-color:var(--accent);background:var(--card2)}.num{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--card2);font-weight:800}.scale-option.active .num{background:var(--accent);color:#25143d}.bars{display:grid;gap:10px}.barrow{display:grid;grid-template-columns:154px 1fr 42px;gap:10px;align-items:center}.bartrack{height:10px;border-radius:999px;background:var(--card2);overflow:hidden}.bartrack span{display:block;height:100%;background:var(--accent)}.result-title{font-size:clamp(22px,5vw,32px);font-weight:850;margin:8px 0 16px}.result-block{padding:14px 0;border-top:1px solid var(--line)}.quality.good{color:var(--ok)}.quality.mid{color:var(--warn)}.quality.low{color:var(--bad)}.hidden{display:none!important}.tiny{font-size:.84rem}@media(max-width:620px){.card{padding:18px}.grid,.likert{grid-template-columns:1fr}.barrow{grid-template-columns:120px 1fr 38px}.top{align-items:flex-start}}</style></head><body data-theme="dark"><main class="wrap"><header class="top"><div><span class="pill">mf01sm · v3.1.0</span><h1>认知与取向测试</h1></div><button id="themeBtn" class="button secondary" type="button">浅色</button></header><section id="intro" class="card"><h2>开始之前</h2><p class="muted">v3.1 将性别方向、浪漫吸引、身体/性吸引和关系互动分开计分。结果用于自我探索与版本化统计，不是临床诊断，也不会替你决定任何身份标签。</p><div class="field"><label for="nickname">昵称</label><input id="nickname" maxlength="80" autocomplete="off" placeholder="例如 Observer_01"></div><div class="field"><label for="age">年龄</label><input id="age" type="number" min="13" max="90" inputmode="numeric" placeholder="13–90"></div><div class="note tiny">本版本含身体/性吸引题，因此仅面向 13 岁及以上。为了和旧版数据连续，仍保留版本号和旧数据库结构；历史 v2 / v3 记录不会重算或覆盖。v3.1 不请求浏览器定位，也不保存新答卷的原始 IP。</div><div class="actions"><button id="introNext" class="button" type="button">继续</button></div></section><section id="baseline" class="card hidden"><h2>自我报告（只做统计对照）</h2><div class="note"><b>出生指派性别</b>：出生时依据身体特征被记录或指派的性别；它和当前性别认同是两个不同变量。<br><b>性别认同</b>：你内在如何理解自己的性别，不等于性格、穿衣风格或兴趣是否符合刻板印象。<br><b>浪漫吸引</b>：想和某人成为恋爱伴侣、建立带恋爱意味的亲密关系。<br><b>身体/性吸引</b>：身体或性层面的吸引；它不等于实际行为，也不一定和浪漫吸引完全一致。<br><b>取向身份</b>：你自己选择的标签。本测试不会从分数自动推断“同性恋 / 异性恋 / 双性恋 / 无性恋”等身份。</div><div class="field"><label>1. 出生指派性别（后续同/异指派性别换算基准）</label><div class="grid" data-field="assignGender"><button class="choice" data-value="AMAB" type="button">AMAB（出生时指派为男）</button><button class="choice" data-value="AFAB" type="button">AFAB（出生时指派为女）</button></div></div><div class="field"><label>2. 你目前的性别认同更接近？</label><div class="grid" data-field="selfGender"><button class="choice" data-value="男" type="button">男</button><button class="choice" data-value="女" type="button">女</button><button class="choice" data-value="非二元/无性别/酷儿" type="button">非二元 / 无性别 / 酷儿</button><button class="choice" data-value="不确定/其他" type="button">不确定 / 其他</button></div></div><div class="field"><label>3. 你目前最常使用的取向身份描述是？</label><div class="grid" data-field="selfOrientation"><button class="choice" data-value="异性恋" type="button">异性恋</button><button class="choice" data-value="同性恋" type="button">同性恋</button><button class="choice" data-value="双性恋/泛性恋" type="button">双性恋 / 泛性恋</button><button class="choice" data-value="无性恋/灰无性" type="button">无性恋 / 灰无性</button><button class="choice" data-value="酷儿/其他" type="button">酷儿 / 其他</button><button class="choice" data-value="不确定/不使用标签" type="button">不确定 / 不使用标签</button></div></div><div class="field"><label>4. 过去一年，你对自己的性别认同有多稳定？</label><div class="likert" data-field="q1"><button class="choice" data-value="非常稳定" type="button">非常稳定</button><button class="choice" data-value="比较稳定" type="button">比较稳定</button><button class="choice" data-value="有些变化" type="button">有些变化</button><button class="choice" data-value="变化较多" type="button">变化较多</button><button class="choice" data-value="不确定" type="button">不确定</button></div></div><div class="field"><label>5. 你对自己目前的取向身份描述有多确定？</label><div class="likert" data-field="q2"><button class="choice" data-value="非常确定" type="button">非常确定</button><button class="choice" data-value="比较确定" type="button">比较确定</button><button class="choice" data-value="一般" type="button">一般</button><button class="choice" data-value="不太确定" type="button">不太确定</button><button class="choice" data-value="不确定/不使用标签" type="button">不确定 / 不使用标签</button></div></div><div class="field"><label>6. 过去一年，你体验到的吸引方向总体有多稳定？</label><div class="likert" data-field="q3"><button class="choice" data-value="非常稳定" type="button">非常稳定</button><button class="choice" data-value="比较稳定" type="button">比较稳定</button><button class="choice" data-value="有些变化" type="button">有些变化</button><button class="choice" data-value="变化较多" type="button">变化较多</button><button class="choice" data-value="不确定" type="button">不确定</button></div></div><div class="actions"><button id="baselineNext" class="button" type="button">进入量表</button></div></section><section id="quiz" class="card hidden"><div class="top"><span id="qIndex" class="pill"></span><span class="muted tiny">按过去较长一段时间的一般体验作答</span></div><div class="progress"><span id="progress"></span></div><div id="question" class="q"></div><div id="scale" class="scale"></div><div class="actions"><button id="prev" class="button secondary" type="button">← 上一题</button><button id="next" class="button" type="button">下一题 →</button></div></section><section id="result" class="card hidden"><span class="pill">v3.1.0 结果</span><div id="resultTitle" class="result-title"></div><div id="analysis"></div><h3>连续维度分数</h3><div id="bars" class="bars"></div><div class="note tiny">0–100 是 v3.1 内部等权子量表分数，不是人群百分位。分类文字只在分数和差异达到探索性阈值时显示；真正的信度、因子结构和常模要等积累足够 v3.1 样本后，用项目分析、ω/α、EFA/CFA 等方法验证。</div><div class="actions"><button class="button secondary" type="button" onclick="location.reload()">重新测试</button></div></section></main><script>const VERSION='3.1.0';const QUESTIONS=${QUESTION_JSON};const LABELS=['非常不符合','比较不符合','不确定 / 一般','比较符合','非常符合'];const state={nickname:'',age:0,location:'Not collected',selfGender:'',selfOrientation:'',selfLikert:{},assignGender:'',index:0,answers:Array(QUESTIONS.length).fill(null),startedAt:0};const $=s=>document.querySelector(s);const show=id=>{['intro','baseline','quiz','result'].forEach(x=>$('#'+x).classList.toggle('hidden',x!==id));};$('#themeBtn').addEventListener('click',()=>{const dark=document.body.dataset.theme==='dark';document.body.dataset.theme=dark?'light':'dark';$('#themeBtn').textContent=dark?'深色':'浅色';});document.querySelectorAll('[data-field] .choice').forEach(btn=>btn.addEventListener('click',()=>{const box=btn.closest('[data-field]');box.querySelectorAll('.choice').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const key=box.dataset.field;const value=btn.dataset.value;if(key==='selfGender'||key==='selfOrientation'||key==='assignGender')state[key]=value;else state.selfLikert[key]=value;}));$('#introNext').addEventListener('click',()=>{const name=$('#nickname').value.trim();const age=Number($('#age').value);if(!name)return alert('请输入昵称。');if(!Number.isInteger(age)||age<13||age>90)return alert('本版本请输入 13–90 的有效年龄。');state.nickname=name;state.age=age;show('baseline');});$('#baselineNext').addEventListener('click',()=>{if(!state.selfGender||!state.selfOrientation||!state.assignGender||Object.keys(state.selfLikert).length<3)return alert('请完整填写前面的统计项。');state.startedAt=Date.now();show('quiz');render();});$('#prev').addEventListener('click',()=>{if(state.index>0){state.index--;render();}});$('#next').addEventListener('click',()=>{if(state.answers[state.index]===null)return alert('请选择一个程度。');if(state.index<QUESTIONS.length-1){state.index++;render();}else finish();});function render(){const q=QUESTIONS[state.index];$('#qIndex').textContent='题目 '+(state.index+1)+' / '+QUESTIONS.length;$('#progress').style.width=((state.index+1)/QUESTIONS.length*100)+'%';$('#question').textContent=q.text;const root=$('#scale');root.innerHTML='';LABELS.forEach((label,i)=>{const value=i+1;const div=document.createElement('div');div.className='scale-option'+(state.answers[state.index]===value?' active':'');div.innerHTML='<span class="num">'+value+'</span><span>'+label+'</span>';div.addEventListener('click',()=>{state.answers[state.index]=value;render();});root.appendChild(div);});$('#prev').style.visibility=state.index===0?'hidden':'visible';$('#next').textContent=state.index===QUESTIONS.length-1?'生成解析结果':'下一题 →';}function clamp(v){return Math.max(0,Math.min(100,v));}function scoreAxis(key){const vals=QUESTIONS.map((q,i)=>q.key===key?state.answers[i]:null).filter(v=>v!==null);if(!vals.length)return 0;const mean=vals.reduce((a,b)=>a+b,0)/vals.length;return Math.round((mean-1)/4*100);}function longestRun(){let best=0,run=0,last=null;state.answers.forEach((value,i)=>{if(QUESTIONS[i].attention)return;if(value===last)run++;else{last=value;run=1;}if(run>best)best=run;});return best;}function responseQuality(){const checks=QUESTIONS.map((q,i)=>q.attention?{expected:q.attention,actual:state.answers[i]}:null).filter(Boolean);const passed=checks.filter(x=>x.expected===x.actual).length;const attentionScore=checks.length?passed/checks.length*100:100;const groups={};QUESTIONS.forEach((q,i)=>{if(q.pair)(groups[q.pair]||(groups[q.pair]=[])).push(state.answers[i]);});const diffs=[];Object.values(groups).forEach(values=>{if(values.length===2)diffs.push(Math.abs(values[0]-values[1]));});const pairMean=diffs.length?diffs.reduce((a,b)=>a+b,0)/diffs.length:0;const pairScore=clamp(100-pairMean*22);const substantive=state.answers.filter((_,i)=>!QUESTIONS[i].attention);const counts=[1,2,3,4,5].map(v=>substantive.filter(x=>x===v).length);const maxShare=Math.max(...counts)/substantive.length;const run=longestRun();let patternScore=100;if(maxShare>.9||run>=16)patternScore=35;else if(maxShare>.82||run>=12)patternScore=60;else if(maxShare>.74||run>=9)patternScore=80;const duration=Math.max(1,Date.now()-state.startedAt);const msPerItem=duration/QUESTIONS.length;let speedScore=100;if(msPerItem<750)speedScore=35;else if(msPerItem<1200)speedScore=60;else if(msPerItem<1800)speedScore=80;let score=Math.round(attentionScore*.3+pairScore*.35+patternScore*.2+speedScore*.15);if(passed===0&&checks.length)score=Math.min(score,45);else if(passed<checks.length)score=Math.min(score,75);return{score:Math.round(clamp(score)),attention_passed:passed,attention_total:checks.length,pair_score:Math.round(pairScore),pattern_score:patternScore,speed_score:speedScore,ms_per_item:Math.round(msPerItem),longest_run:run,max_option_share:Number(maxShare.toFixed(3))};}function classifyPair(male,female){const max=Math.max(male,female);const diff=male-female;if(max<38)return'LOW';if(male>=62&&female>=62&&Math.abs(diff)<=16)return'BOTH';if(male>=56&&diff>=16)return'MALE';if(female>=56&&diff<=-16)return'FEMALE';return'MIXED';}function assignedRelative(kind,scores){const male=scores[kind+'_m'];const female=scores[kind+'_f'];const same=state.assignGender==='AMAB'?male:female;const other=state.assignGender==='AMAB'?female:male;if(Math.max(same,other)<38)return'LOW';if(same>=62&&other>=62&&Math.abs(same-other)<=16)return'BOTH';if(same>=56&&same-other>=16)return'SAME';if(other>=56&&other-same>=16)return'OTHER';return'MIXED';}function genderProfile(scores){const aligned=scores.gender_aligned,cross=scores.gender_cross,nb=scores.nonbinary;const margin=cross-aligned;if(nb>=68&&nb>=Math.max(aligned,cross)+6)return'NONBINARY';if(cross>=62&&margin>=16)return'CROSS';if(aligned>=62&&margin<=-16)return'ALIGNED';if(aligned>=62&&cross>=62&&Math.abs(margin)<16)return'BOTH';return'MIXED';}function describeAssigned(code,kind){const label=kind==='rom'?'浪漫吸引':'身体/性吸引';if(code==='SAME')return'同指派性别'+label+'更明显';if(code==='OTHER')return'异指派性别'+label+'更明显';if(code==='BOTH')return'双向'+label+'都较明显';if(code==='LOW')return label+'整体较低';return label+'方向较混合';}function buildResult(scores,quality){const gp=genderProfile(scores);let genderTitle='性别方向较混合',genderBody='指派性别一致方向、跨指派性别方向和非二元适配之间，没有出现足够大的单一优势；更适合直接看连续分数。';if(gp==='CROSS'){genderTitle='跨指派性别方向较强';genderBody='以 '+state.assignGender+' 为基准，跨指派性别方向分数明显高于指派性别一致方向。这个描述只反映本量表中的方向，不自动等同于任何身份标签。';}else if(gp==='ALIGNED'){genderTitle='指派性别一致方向较强';genderBody='以 '+state.assignGender+' 为基准，指派性别一致方向分数明显高于跨指派性别方向。';}else if(gp==='NONBINARY'){genderTitle='非二元适配方向较强';genderBody='“只归入男性或女性中的单一类别”对你的贴合度可能较低；这一维度与跨性别/顺性别并不是互斥分类。';}else if(gp==='BOTH'){genderTitle='两种二元方向都较强';genderBody='指派性别一致方向与跨指派性别方向都较高且接近，可能反映情境性、流动性或多重认同体验；本测试不进一步替你命名。';}const romAssigned=assignedRelative('rom',scores);const physAssigned=assignedRelative('phys',scores);const romObject=classifyPair(scores.rom_m,scores.rom_f);const physObject=classifyPair(scores.phys_m,scores.phys_f);const attractionTitle=describeAssigned(romAssigned,'rom')+' · '+describeAssigned(physAssigned,'phys');let attractionBody='浪漫吸引与身体/性吸引分开计算：男性浪漫 '+scores.rom_m+'，女性浪漫 '+scores.rom_f+'；男性身体/性吸引 '+scores.phys_m+'，女性身体/性吸引 '+scores.phys_f+'。';if(romObject!==physObject)attractionBody+=' 两种吸引的对象分布并不完全相同，因此不把它们压成一个取向标签。';const initiative=scores.initiative>=62?'主动推进较强':scores.initiative<=38?'回应/等待较多':'主动与回应较均衡';const autonomy=scores.autonomy>=62?'自主决定偏好较强':scores.autonomy<=38?'更容易接受对方承担决定责任':'自主与共同决定较均衡';const qualityLabel=quality.score>=80?'较高':quality.score>=60?'一般':'较低';return{title:genderTitle+' · '+attractionTitle,genderBody,attractionBody,relationBody:initiative+'；'+autonomy+'。这两个维度描述互动风格，不等同于性别角色或性行为位置。',qualityLabel};}async function finish(){const quality=responseQuality();const scores={gender_aligned:scoreAxis('gender_aligned'),gender_cross:scoreAxis('gender_cross'),nonbinary:scoreAxis('nonbinary'),rom_m:scoreAxis('rom_m'),rom_f:scoreAxis('rom_f'),phys_m:scoreAxis('phys_m'),phys_f:scoreAxis('phys_f'),initiative:scoreAxis('initiative'),autonomy:scoreAxis('autonomy')};scores.m=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;scores.f=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;scores.attr_m=Math.round((scores.rom_m+scores.phys_m)/2);scores.attr_f=Math.round((scores.rom_f+scores.phys_f)/2);scores.agender=scores.nonbinary;scores.ace=Math.round(clamp(100-Math.max(scores.phys_m,scores.phys_f)));scores.top=scores.initiative;scores.bot=100-scores.initiative;scores.d=scores.autonomy;scores.s=100-scores.autonomy;scores.trans=Math.round(clamp(50+(scores.gender_cross-scores.gender_aligned)*.6));scores.pan=Math.round(clamp(Math.min(scores.attr_m,scores.attr_f)));scores.validity=quality.score;scores.response_quality=quality.score;scores.response_quality_detail=quality;scores.duration_ms=Date.now()-state.startedAt;scores._schema='assigned-sex-v3.1-multidimensional';scores._scoring='unweighted-subscale-means';scores._legacy_composites=['m','f','attr_m','attr_f','agender','ace','top','bot','d','s','trans','pan','validity'];scores._answers=Object.fromEntries(QUESTIONS.map((q,i)=>[q.id,state.answers[i]]));const result=buildResult(scores,quality);$('#resultTitle').textContent=result.title;const qualityClass=quality.score>=80?'good':quality.score>=60?'mid':'low';$('#analysis').innerHTML='<div class="result-block"><b>性别方向</b><p>'+result.genderBody+'</p></div><div class="result-block"><b>吸引方向</b><p>'+result.attractionBody+'</p></div><div class="result-block"><b>关系互动</b><p>'+result.relationBody+'</p></div><div class="result-block"><b>作答质量提示</b><p class="quality '+qualityClass+'">'+quality.score+'/100（'+result.qualityLabel+'）。注意力检查 '+quality.attention_passed+'/'+quality.attention_total+'，语义平行题一致度 '+quality.pair_score+'/100。'+(quality.score<60?'本次结果建议只作低置信度参考。':'该分数只用于识别明显的随意作答，不是心理学“效度分”。')+'</p></div>';const bars=[['指派性别一致',scores.gender_aligned],['跨指派性别',scores.gender_cross],['非二元适配',scores.nonbinary],['男性浪漫吸引',scores.rom_m],['女性浪漫吸引',scores.rom_f],['男性身体/性吸引',scores.phys_m],['女性身体/性吸引',scores.phys_f],['主动推进',scores.initiative],['自主掌控',scores.autonomy]];$('#bars').replaceChildren();bars.forEach(pair=>{const row=document.createElement('div');row.className='barrow';row.innerHTML='<span>'+pair[0]+'</span><span class="bartrack"><span style="width:'+pair[1]+'%"></span></span><b>'+pair[1]+'</b>';$('#bars').appendChild(row);});show('result');try{await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:VERSION,nickname:state.nickname,age:state.age,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfLikert:state.selfLikert,location:state.location,gender:state.assignGender,tag:result.title,scores,timestamp:Date.now()})});}catch(e){console.error('Archive Failed',e);}}</script></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' && request.method === 'GET') return html(getMainHtml());
    if (url.pathname === '/api/save') return saveRecord(request, env);
    if (url.pathname === '/admin' && request.method === 'GET') return html(getAdminHtml());
    if (url.pathname === '/api/admin/data' && request.method === 'GET') return readAdminData(request, env);
    return json({ error: 'not found' }, 404);
  }
};
