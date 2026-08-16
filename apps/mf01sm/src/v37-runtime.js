import v36Entry from './v36-entry.js';

const VERSION = '3.7.0';
const V37_SCHEMA = 'assigned-sex-v3.7-balanced-sm-fantasy';
const QUESTION_FORMAT = 'mixed-v37-sm-fantasy';

const SCORE_KEYS = [
  'gender_aligned','gender_cross','nonbinary','gender_style_masc','gender_style_fem',
  'rom_m','rom_f','rom_nb','phys_m','phys_f','phys_nb','libido','romantic_desire',
  'relationship_openness','initiative','dominance','autonomy','s_like','m_like'
];
const ANSWER_IDS = [
  'ga1','ms1','init1','gc1','fs1','aut1','nb1','dom1','rm1','rf1','rn1','check1',
  'ms2','fs2','ga2','init2','pm1','pf1','pn1','dom2','nb2','aut2','lib1','rd1',
  'ms3','fs3','gc2','init3','ro1','dom3','ga3','fs4','ms4','aut3','check2','nb3',
  'gc3','ms5','fs5','init4','lib2','rd2','dom4','aut4','ms6','fs6','ro2','init5',
  'dom5','aut5','ms7','fs7','sl1','ml1','sl2','ml2','sl3','ml3'
];
const BASELINE_AXES = [
  'gender_identity','gender_expression','sexual_attraction_direction','sexual_attraction_intensity',
  'libido','romantic_tendency','relationship_structure'
];
const RESULT_AXES = [...BASELINE_AXES, 'initiative01', 'dominance', 'autonomy', 's_like', 'm_like'];
const GENDER_SPECIAL = new Set(['agender','bigender','genderfluid']);

// 16+ module: deliberately non-explicit and hypothetical. Every item assumes informed consent,
// clear boundaries and an immediate stop option. These scores are not evidence of real-world acts.
const SM_ITEMS = [
  {id:'sl1',key:'s_like',pair:'sl',type:'intensity',text:'假想一个双方事先约定、随时可以喊停的角色游戏：如果由你来设定规则，让对方完成一点有压力但安全的挑战，这种位置对你的吸引力有多强？'},
  {id:'ml1',key:'m_like',pair:'ml',type:'intensity',text:'假想一个双方事先约定、随时可以喊停的角色游戏：如果由对方来设定规则，让你完成一点有压力但安全的挑战，这种位置对你的吸引力有多强？'},
  {id:'sl2',key:'s_like',pair:'sl',type:'likelihood',text:'完全虚构、边界清楚且对方明确同意时，你会想不想暂时掌握更强的节奏，故意给对方增加一点可控的难度或压迫感？'},
  {id:'ml2',key:'m_like',pair:'ml',type:'likelihood',text:'完全虚构、边界清楚且你随时可以退出时，你会想不想暂时把节奏交给对方，让自己承受一点可控的难度或压迫感？'},
  {id:'sl3',key:'s_like',type:'vibe',text:'双方都清楚“这只是游戏”、结束后恢复平等时，“我会觉得让对方在安全范围里稍微吃点苦、被我为难一下挺有戏剧张力”这句话有多像你的假想偏好？'},
  {id:'ml3',key:'m_like',type:'vibe',text:'双方都清楚“这只是游戏”、结束后恢复平等时，“我会觉得自己在安全范围里稍微吃点苦、被对方为难一下挺有戏剧张力”这句话有多像你的假想偏好？'}
];

function text(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function parseObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function validScore(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}
function valid01(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
function validV37Scores(scores) {
  if (scores._schema !== V37_SCHEMA || scores._scoring !== 'unweighted-subscale-means' || scores._question_format !== QUESTION_FORMAT) return false;
  if (!SCORE_KEYS.every(key => validScore(scores[key]))) return false;
  const answers = parseObject(scores._answers);
  if (!ANSWER_IDS.every(id => Number.isInteger(answers[id]) && answers[id] >= 1 && answers[id] <= 5)) return false;
  const quality = parseObject(scores.response_quality_detail);
  const thresholds = parseObject(quality.run_thresholds);
  if (quality.attention_total !== 2 || !validScore(scores.response_quality) || thresholds.mild !== 16 || thresholds.mid !== 21 || thresholds.severe !== 28) return false;
  const axes = parseObject(scores.axes01);
  if (!RESULT_AXES.every(key => valid01(axes[key]))) return false;
  const selfAxes = parseObject(parseObject(scores._self_report).axes);
  const genderNumeric = valid01(selfAxes.gender_identity);
  const genderSpecial = GENDER_SPECIAL.has(selfAxes.gender_identity_special);
  if (genderNumeric === genderSpecial) return false;
  for (const key of BASELINE_AXES.slice(1)) if (!valid01(selfAxes[key])) return false;
  return true;
}

async function saveV37(request, env, data) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 256000) return json({ error: 'payload too large' }, 413);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);
  const nickname = text(data.nickname, 80);
  const age = Number(data.age);
  const assignGender = data.gender === 'AMAB' || data.gender === 'AFAB' ? data.gender : '';
  if (!nickname || !Number.isInteger(age) || age < 16 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const scores = parseObject(data.scores);
  if (!validV37Scores(scores)) return json({ error: 'questionnaire schema/version mismatch' }, 400);
  const scoreJson = JSON.stringify(scores);
  if (scoreJson.length > 100000) return json({ error: 'scores too large' }, 413);
  const selfLikert = parseObject(data.selfLikert);
  const timestamp = Number.isSafeInteger(data.timestamp) && data.timestamp > 0 ? data.timestamp : Date.now();
  const id = `rec_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  const ip = text(request.headers.get('CF-Connecting-IP') || request.headers.get('cf-connecting-ip') || 'Unknown', 96);
  const location = text(data.location, 160) || 'Unavailable';
  try {
    await env.mf01smsql.prepare(`INSERT INTO records
      (id, version, nickname, age, self_gender, self_orientation, self_likert, location, ip, assign_gender, tag, scores, timestamp)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
      .bind(id, VERSION, nickname, age, text(data.selfGender, 80), text(data.selfOrientation, 80), JSON.stringify(selfLikert), location, ip, assignGender, text(data.tag, 240), scoreJson, timestamp).run();
    return json({ success: true, d1: true, kv: false, version: VERSION });
  } catch (error) {
    console.error('mf01sm.v37-d1-save', error);
  }
  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version: VERSION, nickname, age, gender: assignGender, location, ip, d1_synced: false, timestamp }));
    return json({ success: true, d1: false, kv: true, version: VERSION });
  } catch (error) {
    console.error('mf01sm.v37-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

function patchQuestions(html) {
  const start = html.indexOf('const QUESTIONS=');
  const end = start >= 0 ? html.indexOf(';const LABELS=', start) : -1;
  if (start < 0 || end <= start) return html;
  let questions;
  try { questions = JSON.parse(html.slice(start + 'const QUESTIONS='.length, end)); }
  catch { return html; }
  const existing = new Set(questions.map(question => question.id));
  for (const item of SM_ITEMS) if (!existing.has(item.id)) questions.push(item);
  return html.slice(0, start) + `const QUESTIONS=${JSON.stringify(questions)}` + html.slice(end);
}

function patchFinish(html) {
  const start = html.indexOf('async function finish(){');
  const end = start >= 0 ? html.indexOf('</script>', start) : -1;
  if (start < 0 || end <= start) return html;
  let finish = html.slice(start, end);
  finish = finish.replace(
    "autonomy:scoreAxis('autonomy')};",
    "autonomy:scoreAxis('autonomy'),s_like:scoreAxis('s_like'),m_like:scoreAxis('m_like')};"
  );
  finish = finish.replace(
    "autonomy:r01(scores.autonomy/100)};scores.axes01=axes01;",
    "autonomy:r01(scores.autonomy/100),s_like:r01(scores.s_like/100),m_like:r01(scores.m_like/100)};scores.axes01=axes01;"
  );
  finish = finish.replace("scores._schema='assigned-sex-v3.6-balanced-personality'", `scores._schema='${V37_SCHEMA}'`);
  finish = finish.replace("scores._question_format='mixed-v36-balanced'", `scores._question_format='${QUESTION_FORMAT}'`);
  finish = finish.replace(
    "const fun=(()=>{",
    "const sm='<div class=\"personality-summary\"><div class=\"personality-card\"><b>S-like 假想</b><strong>'+scores.s_like+'/100</strong></div><div class=\"personality-card\"><b>M-like 假想</b><strong>'+scores.m_like+'/100</strong></div></div><div class=\"personality-note\">仅表示对知情同意、边界清楚、随时可停止的虚构角色情境的兴趣；不代表现实经历、现实行为意愿，也不构成对任何未经协商行为的同意。</div>';const fun=(()=>{"
  );
  finish = finish.replace(
    "+personality+interaction+'</div><div class=\"result-block\"><b>第一页自评 ↔ 题目画像</b>",
    "+personality+interaction+sm+'</div><div class=\"result-block\"><b>第一页自评 ↔ 题目画像</b>"
  );
  finish = finish.replace(
    "['autonomy','交托 / 自主','交托','协商','自主']];",
    "['autonomy','交托 / 自主','交托','协商','自主'],['s_like','S-like 假想','低','中间','高'],['m_like','M-like 假想','低','中间','高']];"
  );
  finish = finish.replace(
    "note.textContent='v3.6 将非性人格/互动放回主体：男子气/女子气是独立的文化编码风格分，不是性别认同；0/1 是日常互动的回应↔发起；跟随↔主导是非性人际控制偏好。';",
    "note.textContent='v3.7 继续以非性人格/互动为主体，并加入 16+ 的 S-like / M-like 假想模块。所有相关题都默认知情同意、边界清楚且随时可以停止；它们不是现实行为判断。';"
  );
  finish = finish.replaceAll("version:'3.6.0'", `version:'${VERSION}'`);
  return html.slice(0, start) + finish + html.slice(end);
}

const AGE_GATE = String.raw`<script id="mf01sm-v37-age-gate">(()=>{const age=document.getElementById('age');if(age){age.min='16';age.max='90';age.placeholder='16–90';}const btn=document.getElementById('introNext');btn?.addEventListener('click',event=>{const n=Number(age?.value);if(!Number.isInteger(n)||n<16||n>90){event.stopImmediatePropagation();alert('v3.7 仅面向 16–90 岁。S/M-like 部分只使用非露骨、纯假想、默认知情同意且可随时停止的情境。');}},true);})();</script>`;

function patchMain(html) {
  html = html.replaceAll('3.6.0', VERSION);
  html = patchQuestions(html);
  html = patchFinish(html);
  html = html.replace('min="13" max="90"', 'min="16" max="90"').replace('placeholder="13–90"', 'placeholder="16–90"');
  html = html.replaceAll('13 岁及以上', '16 岁及以上');
  const introMarker = '<section id="intro" class="card"><h2>开始之前</h2>';
  const notice = '<div class="note tiny"><b>年龄门槛：16+</b>。本版包含 S-like / M-like 的纯假想题：不描述具体性行为或身体细节，所有情境都默认知情同意、边界清楚、随时可以停止；结果只表示对虚构角色/强度情境的兴趣。</div>';
  if (html.includes(introMarker) && !html.includes('年龄门槛：16+')) html = html.replace(introMarker, introMarker + notice);
  if (!html.includes('mf01sm-v37-age-gate')) html = html.replace('</body>', `${AGE_GATE}</body>`);
  return html;
}

function patchAdmin(html) {
  const marker = "let scoreText;if(String(item.version||'').startsWith('3.6')){";
  const branch = "let scoreText;if(String(item.version||'').startsWith('3.7')){const ax=sc.axes01||{};const f=v=>Number.isFinite(Number(v))?Number(v).toFixed(3):'-';scoreText='G:'+f(ax.gender_identity)+' 男气:'+Math.round(sc.gender_style_masc||0)+' 女气:'+Math.round(sc.gender_style_fem||0)+' 01:'+f(ax.initiative01)+' 主导:'+f(ax.dominance)+' 自主:'+f(ax.autonomy)+' S:'+Math.round(sc.s_like||0)+' M:'+Math.round(sc.m_like||0)+' | 吸向:'+f(ax.sexual_attraction_direction)+' 性吸:'+f(ax.sexual_attraction_intensity)+' 欲:'+f(ax.libido)+' 浪:'+f(ax.romantic_tendency)+' | 质量:'+Math.round(sc.response_quality||0)+' 注:'+Math.round((sc.response_quality_detail||{}).attention_passed||0)+'/'+Math.round((sc.response_quality_detail||{}).attention_total||0)+' 平行:'+Math.round((sc.response_quality_detail||{}).pair_score||0)+' 速:'+Math.round((sc.response_quality_detail||{}).ms_per_item||0)+'ms/题';}else if(String(item.version||'').startsWith('3.6')){";
  return html.replace(marker, branch);
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/api/save' && request.method === 'POST') {
    let data;
    try { data = await request.clone().json(); }
    catch { return json({ error: 'invalid JSON' }, 400); }
    if (text(data?.version, 24) === VERSION) return saveV37(request, env, data);
    return v36Entry.fetch(request, env, ctx);
  }
  const response = await v36Entry.fetch(request, env, ctx);
  if (request.method !== 'GET') return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  if (url.pathname !== '/' && url.pathname !== '/admin') return response;
  const original = await response.text();
  const body = url.pathname === '/admin' ? patchAdmin(original) : patchMain(original);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default { fetch(request, env, ctx) { return route(request, env, ctx); } };
