import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  V4_VERSION,V4_SCHEMA,V4_QUESTION_FORMAT,V4_QUESTIONS,V4_SCORE_KEYS,V4_RADAR_AXES,
  LOCKED_TAG_VOCABULARY,scoreV4Answers,classifyV4Result
} from '../apps/mf01sm/src/v4-model.js';
import { MAIN_HTML, ADMIN_HTML } from '../apps/mf01sm/src/current-pages.generated.js';
import current from '../apps/mf01sm/src/current-runtime.js';

assert.equal(V4_VERSION, '4.0.1');
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

for (const tag of LOCKED_TAG_VOCABULARY) assert.ok(MAIN_HTML.includes(tag),`locked vocabulary missing: ${tag}`);
assert.ok(MAIN_HTML.includes('本机答题记录'));
assert.ok(MAIN_HTML.includes('0 / 1 自我感觉（可多选，但至少选一项）'));
assert.ok(MAIN_HTML.includes("if(!selfRole01.length)return alert('0 / 1 自我感觉至少选一项；两项都可以选。')"));
assert.ok(MAIN_HTML.includes('flag-haze') && MAIN_HTML.includes('filter:blur(42px)'),'blurred gradient flag must render');
assert.ok(MAIN_HTML.includes('维度雷达') && MAIN_HTML.includes('radar-leaf'));
assert.ok(MAIN_HTML.includes('window.mf01smV4History'));
assert.ok(MAIN_HTML.includes("return'MF01SM4:'+packPlain(historyCache)"),'copy/export must use portable uncompressed payloads');
assert.ok(MAIN_HTML.includes("a.reuse===q.reuse"),'history reuse must require an unchanged reuse key');
assert.ok(MAIN_HTML.includes("payload:'mf01sm-v4-record-1'"));
assert.ok(MAIN_HTML.includes('_item_manifest=QUESTIONS.map'));
assert.ok(MAIN_HTML.includes('reused_ids:[...state.reusedIds]'));
for (const text of ['v4 把 0 / 1','reuse key','独立叶片雷达 · v4.x 稳定题目迁移','结果页叶片雷达','非二元认同分只来自','也可在控制台调用','旧版单轴','v4 终于','13–15 岁不会出现四组 16+ 极端娱乐后缀']) assert.ok(!MAIN_HTML.includes(text),`developer-facing copy leaked: ${text}`);
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
fullScores._self_report={gender_label:'测试',orientation_label:'测试',role01:['0','1']};
fullScores._item_manifest=V4_QUESTIONS.map(q=>({id:q.id,reuse:q.reuse,key:q.key||null,type:q.type,origin:q.origin||null,attention:q.attention||null}));
fullScores._record={payload:'mf01sm-v4-record-1',version:V4_VERSION,schema:V4_SCHEMA,question_format:V4_QUESTION_FORMAT,profile:{nickname:'regression',age:16,assignGender:'AMAB',selfGender:'测试',selfOrientation:'测试',selfRole01:['0','1']},history:{source_version:'4.0.1',reused_ids:V4_QUESTIONS.map(q=>q.id)},timing:{started_at:1,finished_at:2,duration_ms:1},client:{language:'zh-CN',timezone:'Asia/Shanghai',viewport:[9999,9999],user_agent:'x'.repeat(320)},location:'31.230400, 121.473700',result:{tag:'test',chips:['a','b'],radar_axes:Object.fromEntries(V4_RADAR_AXES.map(([k])=>[k,fullScores[k]]))}};
const scoreJson=JSON.stringify(fullScores);
assert.ok(scoreJson.length<180000,`complete score payload must fit runtime bound, got ${scoreJson.length}`);
let inserted=null,kvWrites=0;
const env={mf01smsql:{prepare(sql){assert.match(sql,/INSERT INTO records/);return{bind(...values){inserted=values;return{async run(){return{success:true}}}}}}},mf01sm:{async put(){kvWrites++}}};
const save=await current.fetch(new Request('https://mf01sm.internal/api/save',{method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':'127.0.0.1'},body:JSON.stringify({version:V4_VERSION,nickname:'regression',age:16,gender:'AMAB',selfGender:'测试',selfOrientation:'测试',selfLikert:{role01:['0','1']},location:'Unavailable',tag:'test',scores:fullScores,timestamp:Date.now()})}),env);
assert.equal(save.status,200);const saveJson=await save.json();assert.equal(saveJson.d1,true);assert.equal(saveJson.kv,false);assert.equal(kvWrites,0);assert.ok(inserted);const persisted=JSON.parse(inserted[11]);assert.deepEqual(persisted._answers,fullScores._answers,'raw answers must be persisted');assert.deepEqual(persisted._item_manifest,fullScores._item_manifest,'item manifest must be persisted');assert.equal(persisted._record.payload,'mf01sm-v4-record-1');

console.log(`mf01sm v4 regressions passed: ${V4_QUESTIONS.length} responses, 16/56 sensitive-footprint items, independent 0/1 + M/F + S/M + attraction + mono/poly axes, direct nonbinary identity, aesthetic leaf, portable v4.x history, complete D1 payload (${scoreJson.length} chars).`);
