import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  V4_VERSION,V4_SCHEMA,V4_QUESTION_FORMAT,V4_QUESTIONS,V4_SCORE_KEYS,V4_RADAR_AXES,
  LOCKED_TAG_VOCABULARY,scoreV4Answers,classifyV4Result
} from '../apps/mf01sm/src/v4-model.js';
import { MAIN_HTML, ADMIN_HTML } from '../apps/mf01sm/src/current-pages.generated.js';
import current from '../apps/mf01sm/src/current-runtime.js';

assert.equal(V4_VERSION, '4.0.4');
assert.equal(V4_SCHEMA, 'mf01sm-v4-independent-leaf');
assert.equal(V4_QUESTION_FORMAT, 'mixed-v4-stable-reuse');
assert.equal(V4_QUESTIONS.length, 58, 'v4 keeps the 58-response footprint');
assert.equal(new Set(V4_QUESTIONS.map(q=>q.id)).size, 58, 'question IDs must be unique');
assert.equal(new Set(V4_QUESTIONS.map(q=>q.reuse)).size, 58, 'reuse keys must be unique');
assert.equal(V4_QUESTIONS.filter(q=>q.attention).length, 2, 'v4 retains two attention checks');
assert.equal(V4_QUESTIONS.filter(q=>!q.attention).length, 56, 'v4 has 56 substantive items');

const counts = Object.fromEntries(V4_SCORE_KEYS.map(key=>[key,V4_QUESTIONS.filter(q=>q.key===key).length]));
assert.deepEqual(counts, {
  gender_aligned:3,gender_cross:3,nonbinary_identity:3,gender_style_masc:7,gender_style_fem:7,aesthetic:7,
  role0:5,role1:5,s_like:3,m_like:3,attr_m:2,attr_f:2,sexual_expression:2,romantic_tendency:2,mono:1,poly:1
});
const sensitiveKeys = new Set(['attr_m','attr_f','sexual_expression','romantic_tendency','mono','poly','s_like','m_like']);
assert.equal(V4_QUESTIONS.filter(q=>sensitiveKeys.has(q.key)).length, 16, 'sex/romance/relationship/S-M footprint must stay at 16/56 substantive items');

const nb = V4_QUESTIONS.filter(q=>q.key==='nonbinary_identity');
assert.equal(nb.length,3);
for (const q of nb) {
  assert.match(q.text,/自己|我的|实际性别体验|概括自己/,`${q.id} must ask about the respondent's own identity`);
  assert.doesNotMatch(q.text,/角色创建器|包容别人|尊重别人|别人不急着把你固定/,`${q.id} must not score generic inclusivity`);
}
assert.equal(V4_QUESTIONS.some(q=>q.id==='nb1'&&q.reuse==='nb1:4'),true);
assert.equal(V4_QUESTIONS.some(q=>q.id==='nb3'&&q.reuse==='nb3:4'),true);

const aesText = V4_QUESTIONS.filter(q=>q.key==='aesthetic').map(q=>q.text).join('\n');
assert.match(aesText,/光线|颜色|材质|氛围/);
assert.match(aesText,/包装|配色|卡片/);
assert.match(aesText,/纪念日|合照|票根/);
assert.match(aesText,/字体|动画|触感/);
assert.equal(V4_RADAR_AXES.some(([k,l])=>k==='aesthetic'&&l==='审美'),true,'aesthetic must be a radar leaf');

const answerByKey = (defaults=3, overrides={}) => Object.fromEntries(V4_QUESTIONS.map(q=>[q.id, q.attention ? q.attention : (overrides[q.key] ?? defaults)]));
let scores = scoreV4Answers(V4_QUESTIONS, answerByKey(3,{role0:5,role1:1}), {assignGender:'AMAB'});
assert.equal(scores.role0,100); assert.equal(scores.role1,0,'0 and 1 must be independently scored');
scores = scoreV4Answers(V4_QUESTIONS, answerByKey(3,{role0:5,role1:5}), {assignGender:'AMAB'});
assert.equal(scores.role0,100); assert.equal(scores.role1,100,'0/1 both-high must be representable');
scores = scoreV4Answers(V4_QUESTIONS, answerByKey(3,{gender_style_masc:5,gender_style_fem:5,aesthetic:1}), {assignGender:'AMAB'});
assert.equal(scores.gender_style_masc,100); assert.equal(scores.gender_style_fem,100); assert.equal(scores.aesthetic,0,'aesthetic must not be folded into femininity');
scores = scoreV4Answers(V4_QUESTIONS, answerByKey(3,{attr_m:5,attr_f:5,mono:5,poly:5,s_like:5,m_like:5}), {assignGender:'AMAB'});
for (const key of ['attr_m','attr_f','mono','poly','s_like','m_like']) assert.equal(scores[key],100,`${key} must allow independent both-high scoring`);
assert.equal(scores._schema,V4_SCHEMA);assert.equal(scores._question_format,V4_QUESTION_FORMAT);assert.equal(Object.keys(scores._answers).length,58);assert.equal(Object.keys(scores._reuse).length,58);

const baseScores = Object.fromEntries(V4_SCORE_KEYS.map(k=>[k,50]));
let r = classifyV4Result({...baseScores,gender_aligned:20,gender_cross:85,nonbinary_identity:20,attr_m:85,attr_f:25,role0:20,role1:80,s_like:90,m_like:20},{assignGender:'AMAB',age:16});
assert.ok(r.tag.startsWith('软糯小蓝梁 / 蓝梁诱捕器 · '));
assert.ok(r.tag.endsWith('爹系狂攻 / 强制爱暴君 / 掌控狂'));
r = classifyV4Result({...baseScores,gender_aligned:20,gender_cross:85,nonbinary_identity:20,attr_m:85,attr_f:25,role0:20,role1:80,s_like:90,m_like:20},{assignGender:'AMAB',age:13});
assert.ok(!r.tag.includes('爹系狂攻 / 强制爱暴君 / 掌控狂'),'13-15 must not get the 16+ extreme suffix');
r = classifyV4Result({...baseScores,gender_aligned:20,gender_cross:35,nonbinary_identity:90,attr_m:50,attr_f:50},{assignGender:'AMAB',age:16});
assert.ok(r.tag.startsWith('第四性 / 电子盆栽 · '),'direct nonbinary identity must take its locked prefix when clearly dominant');
r = classifyV4Result({...baseScores,attr_m:20,attr_f:20,sexual_expression:100},{assignGender:'AMAB',age:16});
assert.ok(r.tag.startsWith('纯爱战神 / 戒断圣体 · '),'low attraction classification must not be suppressed by high expression');

// Real 4.0.2 result-page regression from production: AFAB 67/33 identity with 50/50 attraction is aligned + mixed, not straight.
r = classifyV4Result({...baseScores,gender_aligned:67,gender_cross:33,nonbinary_identity:58,attr_m:50,attr_f:50,role0:60,role1:45,s_like:42,m_like:50,aesthetic:75,mono:75,poly:75},{assignGender:'AFAB',age:16});
assert.ok(r.tag.startsWith('杂食恶犬 / 荤素不忌 · '),'50/50 mixed attraction must not fall through to 普通顺直女');
assert.ok(r.tag.endsWith('端水大师 / 薛定谔的XP'));
assert.ok(r.chips.includes('出生指派方向明显'),'67/33 aligned-vs-cross must not be labelled 性别方向较混合');
assert.ok(r.chips.includes('吸引方向混合'));
assert.equal(r.flags.aligned,true);
assert.equal(r.flags.mixedAttraction,true);
assert.equal(r.flags.panish,false,'50/50 remains a moderate mixed-attraction result, not the stronger panish flag');

// The former 50/63 gray hole also stays mixed; an unambiguous 75/0 profile remains straight for aligned AFAB.
r = classifyV4Result({...baseScores,gender_aligned:75,gender_cross:25,attr_m:50,attr_f:63},{assignGender:'AFAB',age:16});
assert.ok(r.tag.startsWith('杂食恶犬 / 荤素不忌 · '));
assert.ok(r.chips.includes('吸引方向混合'));
r = classifyV4Result({...baseScores,gender_aligned:83,gender_cross:42,attr_m:75,attr_f:0},{assignGender:'AFAB',age:16});
assert.ok(r.tag.startsWith('普通顺直女 · '));
assert.ok(r.chips.includes('出生指派方向明显'));
assert.ok(r.chips.includes('偏男吸引'));

for (const tag of LOCKED_TAG_VOCABULARY) assert.ok(MAIN_HTML.includes(tag),`locked vocabulary missing: ${tag}`);
assert.ok(MAIN_HTML.includes('本机答题记录'));
assert.ok(MAIN_HTML.includes('光谱自我定位'));
assert.ok(MAIN_HTML.includes('这一页不会参与测试计分。'));
for (const key of ['gender_expression','sexual_attraction_direction','sexual_attraction_intensity','libido','romantic_tendency','relationship_structure']) assert.ok(MAIN_HTML.includes('data-axis=\"'+key+'\"'),`self-report axis missing: ${key}`);
assert.ok(!MAIN_HTML.includes('id=\"selfRole0\"') && !MAIN_HTML.includes('id=\"selfRole1\"'),'3.8.2 self-report page must not grow questionnaire 0/1 controls');
assert.ok(MAIN_HTML.includes('flag-haze') && MAIN_HTML.includes('filter:blur(42px)'),'blurred gradient flag must render');
assert.ok(MAIN_HTML.includes('维度雷达') && MAIN_HTML.includes('radar-leaf'));
assert.ok(MAIN_HTML.includes('id=\"locationGate\"') && MAIN_HTML.includes('id=\"locationRetry\"'),'location denial must leave a visible retry gate');
assert.ok(MAIN_HTML.includes('请在有位置信息权限的浏览器中打开，并赋予本站位置权限后重试。'),'location denial copy must tell the user how to recover permission');
assert.ok(MAIN_HTML.includes("navigator.permissions.query({name:'geolocation'})") && MAIN_HTML.includes("window.addEventListener('focus'"),'location permission changes must be observed for retry');
assert.ok(MAIN_HTML.includes("const ok=await requestRequiredLocation();if(!ok)return;syncStatsUi();show('baseline');"),'baseline must stay blocked until location succeeds');
assert.ok(!MAIN_HTML.includes("state.location='Denied'"),'denied location must not silently fall through into the questionnaire');
assert.ok(MAIN_HTML.includes('<div class=\"result-block\"><h3>自我定位 ↔ 题目画像</h3>'),'comparison card must render as valid HTML');
assert.ok(!MAIN_HTML.includes('class=\\\"result-block\\\"><h3>自我定位 ↔ 题目画像'),'comparison card must not contain literal generator escapes');
assert.ok(MAIN_HTML.includes('window.mf01smV4History'));
assert.ok(MAIN_HTML.includes("return'MF01SM4:'+packPlain(historyCache)"),'copy/export must use portable uncompressed payloads');
assert.ok(MAIN_HTML.includes("entry.answers?.[q.reuse]"),'history reuse must use the stable reuse key');
assert.ok(MAIN_HTML.includes("a.fp===ANSWER_COMPAT[q.reuse]"),'history reuse must also require the item-definition fingerprint');
assert.ok(MAIN_HTML.includes("HISTORY_FORMAT='mf01sm-v4-history-2'") && MAIN_HTML.includes("ANSWER_COMPAT_FORMAT='mf01sm-v4-answers-1'"));
assert.ok(!MAIN_HTML.includes('mf01sm-v4-history-1'),'4.0/4.0.1 history is intentionally outside the compatibility baseline');
assert.ok(MAIN_HTML.includes("payload:'mf01sm-v4-record-2'"));
assert.ok(!MAIN_HTML.includes('scores._self_report='),'self-report statistics must remain independent from questionnaire scores');
assert.ok(MAIN_HTML.includes('_item_manifest=QUESTIONS.map'));
assert.ok(MAIN_HTML.includes('reused_ids:[...state.reusedIds]'));
for (const text of ['v4 把 0 / 1','reuse key','独立叶片雷达 · v4.x 稳定题目迁移','结果页叶片雷达','非二元认同分只来自','也可在控制台调用','旧版单轴','v4 终于','13–15 岁不会出现四组 16+ 极端娱乐后缀','作答质量 / 回传','统计已回传：','D1','KV fallback']) assert.ok(!MAIN_HTML.includes(text),`developer-facing copy leaked: ${text}`);
assert.ok(!MAIN_HTML.includes('"origin":'),'question provenance must not be shipped in browser questionnaire JSON');
assert.ok(!MAIN_HTML.includes("+(q.origin||'v4')"),'question header must not expose source provenance');
assert.ok(ADMIN_HTML.includes('完整记录 / Raw') && ADMIN_HTML.includes('JSON.stringify(item,null,2)'));

for (const [name,html] of [['main',MAIN_HTML],['admin',ADMIN_HTML]]) {
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  assert.ok(scripts.length>=1,`${name} must contain script`);
  for (const script of scripts) assert.doesNotThrow(()=>new Function(script),`${name} inline script must parse`);
}

// Construct a maximum-detail record and verify the flat runtime persists the complete score JSON to D1.
const fullAnswers=answerByKey(5);
const fullScores=scoreV4Answers(V4_QUESTIONS,fullAnswers,{assignGender:'AMAB'});
fullScores.response_quality=100;
fullScores.response_quality_detail={attention_total:2,attention_passed:2,pair_score:100,straightline_ratio:1,duration_ms:123456,ms_per_item:2128,reused_count:58,run_thresholds:{mild:16,mid:22,severe:30}};
fullScores._item_manifest=V4_QUESTIONS.map(q=>({id:q.id,reuse:q.reuse,key:q.key||null,type:q.type,origin:q.origin||null,attention:q.attention||null}));
fullScores._record={payload:'mf01sm-v4-record-2',version:V4_VERSION,schema:V4_SCHEMA,question_format:V4_QUESTION_FORMAT,answer_compat:'mf01sm-v4-answers-1',profile:{nickname:'regression',age:16,assignGender:'AMAB'},history:{source_version:'4.0.2',reused_ids:V4_QUESTIONS.map(q=>q.id)},timing:{started_at:1,finished_at:2,duration_ms:1},client:{language:'zh-CN',timezone:'Asia/Shanghai',viewport:[9999,9999],user_agent:'x'.repeat(320)},location:'31.230400, 121.473700',result:{tag:'test',chips:['a','b'],radar_axes:Object.fromEntries(V4_RADAR_AXES.map(([k])=>[k,fullScores[k]]))}};
const scoreJson=JSON.stringify(fullScores);
assert.ok(scoreJson.length<180000,`complete score payload must fit runtime bound, got ${scoreJson.length}`);
let inserted=null,kvWrites=0;
const env={mf01smsql:{prepare(sql){assert.match(sql,/INSERT INTO records/);return{bind(...values){inserted=values;return{async run(){return{success:true}}}}}}},mf01sm:{async put(){kvWrites++}}};
const fullSelfStats={_schema:'mf01sm-v4-self-stats-1',gender_identity:0.82,gender_identity_special:null,gender_expression:0.76,sexual_attraction_direction:0.61,sexual_attraction_intensity:0.37,libido:0.22,romantic_tendency:0.89,relationship_structure:0.18};
const save=await current.fetch(new Request('https://mf01sm.internal/api/save',{method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':'127.0.0.1'},body:JSON.stringify({version:V4_VERSION,nickname:'regression',age:16,gender:'AMAB',selfGender:'性别轴:0.820',selfOrientation:'性吸引方向:0.610',selfLikert:fullSelfStats,location:'Unavailable',tag:'test',scores:fullScores,timestamp:Date.now()})}),env);
assert.equal(save.status,200);const saveJson=await save.json();assert.equal(saveJson.d1,true);assert.equal(saveJson.kv,false);assert.equal(kvWrites,0);assert.ok(inserted);const persistedSelf=JSON.parse(inserted[6]);assert.deepEqual(persistedSelf,fullSelfStats,'independent self-report statistics must be persisted in self_likert');const persisted=JSON.parse(inserted[11]);assert.deepEqual(persisted._answers,fullScores._answers,'raw answers must be persisted separately in scores');assert.deepEqual(persisted._item_manifest,fullScores._item_manifest,'item manifest must be persisted');assert.equal(persisted._record.payload,'mf01sm-v4-record-2');

console.log(`mf01sm v4 regressions passed: ${V4_QUESTIONS.length} responses, 16/56 sensitive-footprint items, independent 0/1 + M/F + S/M + attraction + mono/poly axes, direct nonbinary identity, aesthetic leaf, portable v4.x history, complete D1 payload (${scoreJson.length} chars).`);
