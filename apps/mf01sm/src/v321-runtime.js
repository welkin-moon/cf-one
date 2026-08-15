import v32Runtime from './v32-runtime.js';

const VERSION = '3.2.1';
const V32_SCHEMA = 'assigned-sex-v3.2-expanded-profile';
const V31_SCHEMA = 'assigned-sex-v3.1-multidimensional';
const REQUIRED_SCORE_KEYS = [
  'gender_aligned','gender_cross','nonbinary','expression_masc','expression_fem',
  'rom_m','rom_f','rom_nb','phys_m','phys_f','phys_nb','libido','romantic_desire',
  'relationship_openness','initiative','autonomy'
];
const REQUIRED_ANSWER_IDS = [
  'ga1','rm1','init1','gc1','rf1','aut1','nb1','pm1','ga2','pf1','gc2','check1',
  'rm2','nb2','rf2','init2','ga3','aut2','gc3','pm2','rf3','nb3','pf2','rm3',
  'pm3','init3','check2','ga4','pf3','aut3','gc4','nb4','init4','aut4',
  'em1','ef1','rn1','pn1','lib1','rd1','ro1','em2','ef2','rn2','pn2','lib2',
  'rd2','ro2','em3','ef3','rn3','pn3','lib3','rd3','ro3','lib4','rd4','ro4'
];

function text(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function parseObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function validScore(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function validV32Scores(scores) {
  if (scores._schema !== V32_SCHEMA || scores._scoring !== 'unweighted-subscale-means') return false;
  if (!REQUIRED_SCORE_KEYS.every(key => validScore(scores[key]))) return false;
  const answers = parseObject(scores._answers);
  if (!REQUIRED_ANSWER_IDS.every(id => Number.isInteger(answers[id]) && answers[id] >= 1 && answers[id] <= 5)) return false;
  const quality = parseObject(scores.response_quality_detail);
  if (quality.attention_total !== 2 || !validScore(scores.response_quality)) return false;
  return true;
}

function validV321Scores(scores) {
  if (!validV32Scores(scores)) return false;
  const thresholds = parseObject(parseObject(scores.response_quality_detail).run_thresholds);
  return thresholds.mild === 16 && thresholds.mid === 21 && thresholds.severe === 28;
}

function resolveRecordVersion(declaredVersion, scores) {
  if (declaredVersion === VERSION) return validV321Scores(scores) ? VERSION : '';
  if (declaredVersion === '3.2.0') {
    if (validV32Scores(scores)) return '3.2.0';
    if (scores._schema === V31_SCHEMA) return '3.1.1';
    return '';
  }
  if ((declaredVersion === '3.1.1' || declaredVersion === '3.1.0') && scores._schema === V31_SCHEMA) return '3.1.1';
  return '';
}

async function saveRecord(request, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 256000) return json({ error: 'payload too large' }, 413);

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
  const recordVersion = resolveRecordVersion(text(data.version, 24), scores);
  if (!recordVersion) return json({ error: 'questionnaire schema/version mismatch' }, 400);
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
      .bind(
        id,
        recordVersion,
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
    return json({ success: true, d1: true, kv: false, version: recordVersion });
  } catch (error) {
    console.error('mf01sm.v321-d1-save', error);
  }

  try {
    await env.mf01sm.put(id, JSON.stringify({
      ...data,
      version: recordVersion,
      nickname,
      age,
      gender: assignGender,
      location,
      ip,
      d1_synced: false,
      timestamp
    }));
    return json({ success: true, d1: false, kv: true, version: recordVersion });
  } catch (error) {
    console.error('mf01sm.v321-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

const RESPONSE_QUALITY_V321 = String.raw`function responseQuality(){const checks=QUESTIONS.map((q,i)=>q.attention?{expected:q.attention,actual:state.answers[i]}:null).filter(Boolean);const passed=checks.filter(x=>x.expected===x.actual).length;const attentionScore=checks.length?passed/checks.length*100:100;const groups={};QUESTIONS.forEach((q,i)=>{if(q.pair)(groups[q.pair]||(groups[q.pair]=[])).push(state.answers[i]);});const diffs=[];Object.values(groups).forEach(values=>{if(values.length===2)diffs.push(Math.abs(values[0]-values[1]));});const pairMean=diffs.length?diffs.reduce((a,b)=>a+b,0)/diffs.length:0;const pairScore=clamp(100-pairMean*22);const substantive=state.answers.filter((_,i)=>!QUESTIONS[i].attention);const counts=[1,2,3,4,5].map(v=>substantive.filter(x=>x===v).length);const maxShare=Math.max(...counts)/substantive.length;const run=longestRun();const n=Math.max(1,substantive.length);const mildRun=Math.ceil(n*.28125),midRun=Math.ceil(n*.375),severeRun=Math.ceil(n*.5);let patternScore=100;if(maxShare>.9||run>=severeRun)patternScore=35;else if(maxShare>.82||run>=midRun)patternScore=60;else if(maxShare>.74||run>=mildRun)patternScore=80;const duration=Math.max(1,Date.now()-state.startedAt);const msPerItem=duration/QUESTIONS.length;let speedScore=100;if(msPerItem<750)speedScore=35;else if(msPerItem<1200)speedScore=60;else if(msPerItem<1800)speedScore=80;let score=Math.round(attentionScore*.3+pairScore*.35+patternScore*.2+speedScore*.15);if(passed===0&&checks.length)score=Math.min(score,45);else if(passed<checks.length)score=Math.min(score,75);return{score:Math.round(clamp(score)),attention_passed:passed,attention_total:checks.length,pair_score:Math.round(pairScore),pattern_score:patternScore,speed_score:speedScore,ms_per_item:Math.round(msPerItem),longest_run:run,max_option_share:Number(maxShare.toFixed(3)),run_thresholds:{mild:mildRun,mid:midRun,severe:severeRun}};}`;

function patchMain(html) {
  html = html.replaceAll('3.2.0', VERSION);
  const start = html.indexOf('function responseQuality(){');
  const end = start >= 0 ? html.indexOf('function classifyPair(', start) : -1;
  if (start >= 0 && end > start) html = html.slice(0, start) + RESPONSE_QUALITY_V321 + html.slice(end);
  return html;
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/api/save') return saveRecord(request, env);
  const response = await v32Runtime.fetch(request, env, ctx);
  if (request.method !== 'GET') return response;
  const type = response.headers.get('content-type') || '';
  if (url.pathname !== '/' || !type.includes('text/html')) return response;
  const original = await response.text();
  const body = patchMain(original);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default { fetch(request, env, ctx) { return route(request, env, ctx); } };
