import v33Runtime from './v33-runtime.js';

const VERSION = '3.4.0';
const V34_SCHEMA = 'assigned-sex-v3.4-continuous-spectrum';
const SCORE_KEYS = [
  'gender_aligned','gender_cross','nonbinary','expression_masc','expression_fem',
  'rom_m','rom_f','rom_nb','phys_m','phys_f','phys_nb','libido','romantic_desire',
  'relationship_openness','multi_partner','initiative','autonomy'
];
const ANSWER_IDS = [
  'ga1','rm1','init1','gc1','rf1','aut1','nb1','pm1','ga2','pf1','gc2','check1',
  'rm2','nb2','rf2','init2','ga3','aut2','gc3','pm2','rf3','nb3','pf2','rm3',
  'pm3','init3','check2','ga4','pf3','aut3','gc4','nb4','init4','aut4',
  'em1','ef1','rn1','pn1','lib1','rd1','ro1','em2','ef2','rn2','pn2','lib2',
  'rd2','ro2','em3','ef3','rn3','pn3','lib3','rd3','ro3','lib4','rd4','ro4',
  'mp1','mp2','mp3','mp4'
];
const AXIS_KEYS = [
  'gender_identity','gender_expression','sexual_orientation','sexual_attraction_intensity',
  'libido','romantic_tendency','relationship_structure'
];
const GENDER_SPECIAL = new Set(['agender','bigender','genderfluid']);

const BASELINE_SECTION = String.raw`<section id="baseline" class="card hidden"><h2>光谱自我定位</h2><div class="field"><label>出生指派性别</label><div class="grid" data-field="assignGender"><button class="choice" data-value="AMAB" type="button">AMAB（出生时指派为男）</button><button class="choice" data-value="AFAB" type="button">AFAB（出生时指派为女）</button></div></div>
<div class="axis-field gender-axis-field"><div class="axis-heading"><b>性别认同</b><output id="axisOutGender" class="axis-value">未选择</output></div><input id="axisGender" class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性别认同连续轴"><div class="axis-labels"><span>男性</span><span>非二元</span><span>女性</span></div><div class="gender-special-title">或选择轴外状态（与上方连续轴四选一）</div><div id="genderSpecials" class="gender-specials"><button class="choice gender-special" data-special="agender" type="button">无性 <small>Agender</small></button><button class="choice gender-special" data-special="bigender" type="button">双性 <small>Bigender</small></button><button class="choice gender-special" data-special="genderfluid" type="button">流动 <small>Genderfluid</small></button></div></div>
<div class="axis-field" data-axis="gender_expression"><div class="axis-heading"><b>性别表达</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性别表达连续轴"><div class="axis-labels"><span>高度男性化</span><span>雌雄同体</span><span>高度女性化</span></div></div>
<div class="axis-field" data-axis="sexual_orientation"><div class="axis-heading"><b>性取向</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性取向连续轴"><div class="axis-labels"><span>直</span><span>双 / 泛</span><span>同性恋</span></div></div>
<div class="axis-field" data-axis="sexual_attraction_intensity"><div class="axis-heading"><b>受到性吸引的强度</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性吸引强度连续轴"><div class="axis-labels"><span>无性恋</span><span>灰无性</span><span>有性吸引</span></div></div>
<div class="axis-field" data-axis="libido"><div class="axis-heading"><b>性欲望 / 性冲动强度</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性欲望强度连续轴"><div class="axis-labels"><span>低欲望</span><span>普通</span><span>高欲望</span></div></div>
<div class="axis-field" data-axis="romantic_tendency"><div class="axis-heading"><b>浪漫倾向</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="浪漫倾向连续轴"><div class="axis-labels"><span>无浪漫倾向</span><span>感兴趣</span><span>浪漫倾向高</span></div></div>
<div class="axis-field" data-axis="relationship_structure"><div class="axis-heading"><b>单偶 / 开放 / 多偶</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="关系结构连续轴"><div class="axis-labels"><span>单偶</span><span>开放</span><span>多偶</span></div></div>
<div class="actions"><button id="baselineNext" class="button" type="button">进入量表</button></div></section>`;

const V34_CSS = String.raw`<style id="mf01sm-v34-spectrum-ux">
.axis-field{display:grid;gap:10px;margin:22px 0;padding:16px;border-radius:20px;background:var(--surface-2);border:1px solid color-mix(in srgb,var(--outline) 72%,transparent)}.axis-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.axis-heading b{font-size:1rem}.axis-value{font-variant-numeric:tabular-nums;font-weight:850;color:var(--accent);min-width:5.5ch;text-align:right}.spectrum-range{width:100%;height:34px;margin:2px 0;appearance:none;-webkit-appearance:none;background:transparent;cursor:grab;touch-action:pan-y}.spectrum-range:active{cursor:grabbing}.spectrum-range::-webkit-slider-runnable-track{height:8px;border-radius:999px;background:linear-gradient(90deg,var(--surface-4),var(--accent),var(--surface-4))}.spectrum-range::-moz-range-track{height:8px;border-radius:999px;background:linear-gradient(90deg,var(--surface-4),var(--accent),var(--surface-4))}.spectrum-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:24px;height:24px;margin-top:-8px;border:3px solid var(--surface-1);border-radius:50%;background:var(--accent);box-shadow:0 1px 6px rgba(0,0,0,.28)}.spectrum-range::-moz-range-thumb{width:20px;height:20px;border:3px solid var(--surface-1);border-radius:50%;background:var(--accent);box-shadow:0 1px 6px rgba(0,0,0,.28)}.spectrum-range:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 40%,transparent);outline-offset:4px;border-radius:999px}.axis-labels{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;color:var(--muted);font-size:.78rem;line-height:1.25}.axis-labels span:nth-child(2){text-align:center}.axis-labels span:last-child{text-align:right}.gender-special-title{font-size:.82rem;color:var(--muted);margin-top:4px}.gender-specials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.gender-special{min-height:52px!important;text-align:center!important}.gender-special small{display:block;font-size:.72rem;color:var(--muted)}.gender-special.active small{color:inherit;opacity:.82}.axis-compare{display:grid;gap:9px}.axis-compare-row{display:grid;grid-template-columns:minmax(120px,1.3fr) minmax(72px,.65fr) minmax(72px,.65fr) minmax(64px,.55fr);gap:8px;align-items:center;padding:10px 12px;border-radius:15px;background:var(--surface-3)}.axis-compare-row b{font-size:.88rem}.axis-compare-head{background:transparent;color:var(--muted);font-size:.78rem;padding-block:2px}.axis-result-labels{display:grid;grid-template-columns:1fr 1fr 1fr;color:var(--muted);font-size:.72rem;margin-top:2px}.axis-result-labels span:nth-child(2){text-align:center}.axis-result-labels span:last-child{text-align:right}@media(max-width:620px){.axis-field{padding:14px;margin:16px 0}.axis-labels{font-size:.72rem}.gender-specials{grid-template-columns:1fr 1fr 1fr}.gender-special{padding:10px 5px!important}.axis-compare-row{grid-template-columns:minmax(0,1fr) auto auto}.axis-compare-row span:last-child{grid-column:2/-1}.axis-compare-head{display:none}}@media(max-width:380px){.gender-specials{grid-template-columns:1fr}.gender-special small{display:inline;margin-left:4px}}
</style>`;

const V34_JS = String.raw`<script id="mf01sm-v34-spectrum-js">(()=>{const fmt=v=>Number(v).toFixed(3);const setNormal=(key,input,out)=>{const select=()=>{const value=Number(input.value);input.dataset.touched='1';state.selfLikert[key]=value;out.textContent=fmt(value);if(key==='sexual_orientation')state.selfOrientation='性取向轴:'+fmt(value);};input.addEventListener('input',select);input.addEventListener('pointerdown',select);input.addEventListener('keydown',select);};document.querySelectorAll('[data-axis]').forEach(box=>{const key=box.dataset.axis,input=box.querySelector('.spectrum-range'),out=box.querySelector('.axis-value');if(input&&out)setNormal(key,input,out);});const gender=document.getElementById('axisGender'),genderOut=document.getElementById('axisOutGender'),specials=[...document.querySelectorAll('[data-special]')];const useGenderAxis=()=>{const value=Number(gender.value);gender.dataset.touched='1';specials.forEach(btn=>btn.classList.remove('active'));state.selfLikert.gender_identity=value;state.selfLikert.gender_identity_special=null;state.selfGender='性别轴:'+fmt(value);genderOut.textContent=fmt(value);};gender?.addEventListener('input',useGenderAxis);gender?.addEventListener('pointerdown',useGenderAxis);gender?.addEventListener('keydown',useGenderAxis);const specialLabels={agender:'无性',bigender:'双性',genderfluid:'流动'};specials.forEach(btn=>btn.addEventListener('click',()=>{specials.forEach(x=>x.classList.toggle('active',x===btn));state.selfLikert.gender_identity=null;state.selfLikert.gender_identity_special=btn.dataset.special;state.selfGender=specialLabels[btn.dataset.special]||btn.dataset.special;genderOut.textContent=state.selfGender;}));const required=['gender_expression','sexual_orientation','sexual_attraction_intensity','libido','romantic_tendency','relationship_structure'];document.getElementById('baselineNext')?.addEventListener('click',event=>{const genderSelected=Number.isFinite(state.selfLikert.gender_identity)||!!state.selfLikert.gender_identity_special;const missing=required.filter(key=>!Number.isFinite(state.selfLikert[key]));if(!state.assignGender||!genderSelected||missing.length){event.stopImmediatePropagation();alert('请完成出生指派性别和全部连续光谱；性别认同也可以选择无性、双性或流动。');}},true);})();</script>`;

const FINISH_V34 = String.raw`async function finish(){
const quality=responseQuality();
const scores={gender_aligned:scoreAxis('gender_aligned'),gender_cross:scoreAxis('gender_cross'),nonbinary:scoreAxis('nonbinary'),expression_masc:scoreAxis('expression_masc'),expression_fem:scoreAxis('expression_fem'),rom_m:scoreAxis('rom_m'),rom_f:scoreAxis('rom_f'),rom_nb:scoreAxis('rom_nb'),phys_m:scoreAxis('phys_m'),phys_f:scoreAxis('phys_f'),phys_nb:scoreAxis('phys_nb'),libido:scoreAxis('libido'),romantic_desire:scoreAxis('romantic_desire'),relationship_openness:scoreAxis('relationship_openness'),multi_partner:scoreAxis('multi_partner'),initiative:scoreAxis('initiative'),autonomy:scoreAxis('autonomy')};
const c01=v=>Math.max(0,Math.min(1,Number(v)));const r01=v=>Number(c01(v).toFixed(4));const is01=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
scores.expression_position=Math.round(clamp(50+(scores.expression_fem-scores.expression_masc)/2));scores.expression_balance=Math.round(clamp(100-Math.abs(scores.expression_fem-scores.expression_masc)));scores.phys_overall=Math.max(scores.phys_m,scores.phys_f,scores.phys_nb);scores.rom_overall=Math.max(scores.rom_m,scores.rom_f,scores.rom_nb);
const genderMale=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;const genderFemale=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;const genderTotal=genderMale+genderFemale+scores.nonbinary;const genderAxis=genderTotal>0?(genderFemale+scores.nonbinary*.5)/genderTotal:.5;const ownGender=is01(state.selfLikert.gender_identity)?state.selfLikert.gender_identity:genderAxis;const pm=scores.phys_m/100,pf=scores.phys_f/100,pn=scores.phys_nb/100;const same=pm*(1-ownGender)+pf*ownGender;const other=pm*ownGender+pf*(1-ownGender);const oriDen=same+other+pn;const orientationAxis=oriDen>0?(same+pn*.5)/oriDen:.5;
const axes01={gender_identity:r01(genderAxis),gender_expression:r01(scores.expression_position/100),sexual_orientation:r01(orientationAxis),sexual_attraction_intensity:r01(scores.phys_overall/100),libido:r01(scores.libido/100),romantic_tendency:r01(scores.romantic_desire/100),relationship_structure:r01((scores.relationship_openness+scores.multi_partner)/200)};scores.axes01=axes01;
scores.m=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;scores.f=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;scores.attr_m=Math.round((scores.rom_m+scores.phys_m)/2);scores.attr_f=Math.round((scores.rom_f+scores.phys_f)/2);scores.agender=scores.nonbinary;scores.ace=Math.round(clamp(100-scores.phys_overall));scores.top=scores.initiative;scores.bot=100-scores.initiative;scores.d=scores.autonomy;scores.s=100-scores.autonomy;scores.trans=Math.round(clamp(50+(scores.gender_cross-scores.gender_aligned)*.6));scores.pan=Math.round(clamp(Math.min(scores.attr_m,scores.attr_f)));scores.validity=quality.score;scores.response_quality=quality.score;scores.response_quality_detail=quality;scores.duration_ms=Date.now()-state.startedAt;
const selfAxes={gender_identity:is01(state.selfLikert.gender_identity)?r01(state.selfLikert.gender_identity):null,gender_identity_special:state.selfLikert.gender_identity_special||null,gender_expression:r01(state.selfLikert.gender_expression),sexual_orientation:r01(state.selfLikert.sexual_orientation),sexual_attraction_intensity:r01(state.selfLikert.sexual_attraction_intensity),libido:r01(state.selfLikert.libido),romantic_tendency:r01(state.selfLikert.romantic_tendency),relationship_structure:r01(state.selfLikert.relationship_structure)};scores._self_report={axes:selfAxes};
const cmp=(self,test)=>is01(self)?{self:r01(self),test:r01(test),gap:r01(Math.abs(test-self)),signed_gap:Number((test-self).toFixed(4))}:{self:null,test:r01(test),gap:null,signed_gap:null};scores.self_test_comparison={gender_identity:cmp(selfAxes.gender_identity,axes01.gender_identity),gender_expression:cmp(selfAxes.gender_expression,axes01.gender_expression),sexual_orientation:cmp(selfAxes.sexual_orientation,axes01.sexual_orientation),sexual_attraction_intensity:cmp(selfAxes.sexual_attraction_intensity,axes01.sexual_attraction_intensity),libido:cmp(selfAxes.libido,axes01.libido),romantic_tendency:cmp(selfAxes.romantic_tendency,axes01.romantic_tendency),relationship_structure:cmp(selfAxes.relationship_structure,axes01.relationship_structure)};const comparable=Object.values(scores.self_test_comparison).filter(v=>v&&v.gap!==null);scores.self_test_comparison.mean_absolute_gap=comparable.length?r01(comparable.reduce((a,v)=>a+v.gap,0)/comparable.length):null;
scores._schema='assigned-sex-v3.4-continuous-spectrum';scores._scoring='unweighted-subscale-means';scores._legacy_composites=['m','f','attr_m','attr_f','agender','ace','top','bot','d','s','trans','pan','validity'];scores._answers=Object.fromEntries(QUESTIONS.map((q,i)=>[q.id,state.answers[i]]));
const defs=[['gender_identity','性别认同','男性','非二元','女性'],['gender_expression','性别表达','高度男性化','雌雄同体','高度女性化'],['sexual_orientation','性取向','直','双 / 泛','同性恋'],['sexual_attraction_intensity','性吸引强度','无性恋','灰无性','有性吸引'],['libido','性欲望强度','低欲望','普通','高欲望'],['romantic_tendency','浪漫倾向','无浪漫','感兴趣','浪漫倾向高'],['relationship_structure','关系结构','单偶','开放','多偶']];const specialLabels={agender:'无性',bigender:'双性',genderfluid:'流动'};const fmt=v=>Number(v).toFixed(3);let rows='<div class="axis-compare"><div class="axis-compare-row axis-compare-head"><b>光谱</b><span>自我定位</span><span>量表</span><span>差值</span></div>';defs.forEach(d=>{const key=d[0],c=scores.self_test_comparison[key];const selfText=key==='gender_identity'&&selfAxes.gender_identity_special?(specialLabels[selfAxes.gender_identity_special]||selfAxes.gender_identity_special):fmt(c.self);const gapText=c.gap===null?'—':fmt(c.gap);rows+='<div class="axis-compare-row"><b>'+d[1]+'</b><span>'+selfText+'</span><span>'+fmt(c.test)+'</span><span>Δ '+gapText+'</span></div>';});rows+='</div>';$('#resultTitle').textContent='连续光谱结果';const qualityClass=quality.score>=80?'good':quality.score>=60?'mid':'low';$('#analysis').innerHTML='<div class="result-block"><b>自我定位 ↔ 量表估计</b><p>所有可比较光谱统一为 0–1。差值只表示两种测量方式的位置差异，不判断哪一个更“真实”。</p>'+rows+'</div><div class="result-block"><b>作答质量提示</b><p class="quality '+qualityClass+'">'+quality.score+'/100。注意力检查 '+quality.attention_passed+'/'+quality.attention_total+'，语义平行题一致度 '+quality.pair_score+'/100，平均 '+quality.ms_per_item+' ms/题。</p></div>';
$('#bars').replaceChildren();defs.forEach(d=>{const value=axes01[d[0]];const row=document.createElement('div');row.className='barrow';row.innerHTML='<span>'+d[1]+'</span><span><span class="bartrack"><span style="width:'+(value*100)+'%"></span></span><span class="axis-result-labels"><span>'+d[2]+'</span><span>'+d[3]+'</span><span>'+d[4]+'</span></span></span><b>'+fmt(value)+'</b>';$('#bars').appendChild(row);});const resultNote=document.querySelector('#result .note.tiny');if(resultNote)resultNote.textContent='0 表示光谱左端，1 表示右端；中间值是连续位置，不是预设类别。';show('result');try{await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:'3.4.0',nickname:state.nickname,age:state.age,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfLikert:state.selfLikert,location:state.location,gender:state.assignGender,tag:'连续光谱结果',scores,timestamp:Date.now()})});}catch(e){console.error('Archive Failed',e);}}
`;

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

function validV34Scores(scores) {
  if (scores._schema !== V34_SCHEMA || scores._scoring !== 'unweighted-subscale-means') return false;
  if (!SCORE_KEYS.every(key => validScore(scores[key]))) return false;
  const answers = parseObject(scores._answers);
  if (!ANSWER_IDS.every(id => Number.isInteger(answers[id]) && answers[id] >= 1 && answers[id] <= 5)) return false;
  const quality = parseObject(scores.response_quality_detail);
  const thresholds = parseObject(quality.run_thresholds);
  if (quality.attention_total !== 2 || !validScore(scores.response_quality) || thresholds.mild !== 17 || thresholds.mid !== 23 || thresholds.severe !== 30) return false;
  const axes = parseObject(scores.axes01);
  if (!AXIS_KEYS.every(key => valid01(axes[key]))) return false;
  const selfAxes = parseObject(parseObject(scores._self_report).axes);
  const genderNumeric = valid01(selfAxes.gender_identity);
  const genderSpecial = GENDER_SPECIAL.has(selfAxes.gender_identity_special);
  if (genderNumeric === genderSpecial) return false;
  for (const key of AXIS_KEYS.slice(1)) if (!valid01(selfAxes[key])) return false;
  return true;
}

async function saveV34(request, env, data) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 256000) return json({ error: 'payload too large' }, 413);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);
  const nickname = text(data.nickname, 80);
  const age = Number(data.age);
  const assignGender = data.gender === 'AMAB' || data.gender === 'AFAB' ? data.gender : '';
  if (!nickname || !Number.isInteger(age) || age < 13 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const scores = parseObject(data.scores);
  if (!validV34Scores(scores)) return json({ error: 'questionnaire schema/version mismatch' }, 400);
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
    console.error('mf01sm.v34-d1-save', error);
  }
  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version: VERSION, nickname, age, gender: assignGender, location, ip, d1_synced: false, timestamp }));
    return json({ success: true, d1: false, kv: true, version: VERSION });
  } catch (error) {
    console.error('mf01sm.v34-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

function stripLegacyBaselineEnhancers(html) {
  return html
    .replace(/<script id="mf01sm-v32-baseline-guard">[\s\S]*?<\/script>/g, '')
    .replace(/<script id="mf01sm-v33-selfid-js">[\s\S]*?<\/script>/g, '')
    .replace(/<script id="mf01sm-gender-spectrum-js">[\s\S]*?<\/script>/g, '');
}

function patchMain(html) {
  html = stripLegacyBaselineEnhancers(html).replaceAll('3.3.0', VERSION);
  const baselineStart = html.indexOf('<section id="baseline"');
  const quizStart = baselineStart >= 0 ? html.indexOf('<section id="quiz"', baselineStart) : -1;
  if (baselineStart >= 0 && quizStart > baselineStart) html = html.slice(0, baselineStart) + BASELINE_SECTION + html.slice(quizStart);
  const finishStart = html.indexOf('async function finish(){');
  const finishEnd = finishStart >= 0 ? html.indexOf('</script>', finishStart) : -1;
  if (finishStart >= 0 && finishEnd > finishStart) html = html.slice(0, finishStart) + FINISH_V34 + html.slice(finishEnd);
  html = html.replace('</head>', `${V34_CSS}</head>`).replace('</body>', `${V34_JS}</body>`);
  return html;
}

function patchAdmin(html) {
  const marker = "let scoreText;if(String(item.version||'').startsWith('3.3')){";
  const branch = "let scoreText;if(String(item.version||'').startsWith('3.4')){const ax=sc.axes01||{};const f=v=>Number.isFinite(Number(v))?Number(v).toFixed(3):'-';scoreText='G:'+f(ax.gender_identity)+' 表:'+f(ax.gender_expression)+' 取:'+f(ax.sexual_orientation)+' 性吸:'+f(ax.sexual_attraction_intensity)+' 欲:'+f(ax.libido)+' 浪:'+f(ax.romantic_tendency)+' 单多:'+f(ax.relationship_structure)+' | 质量:'+Math.round(sc.response_quality||0)+' 注:'+Math.round((sc.response_quality_detail||{}).attention_passed||0)+'/'+Math.round((sc.response_quality_detail||{}).attention_total||0)+' 平行:'+Math.round((sc.response_quality_detail||{}).pair_score||0)+' 速:'+Math.round((sc.response_quality_detail||{}).ms_per_item||0)+'ms/题';}else if(String(item.version||'').startsWith('3.3')){";
  return html.replace(marker, branch);
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/api/save' && request.method === 'POST') {
    let data;
    try { data = await request.clone().json(); }
    catch { return json({ error: 'invalid JSON' }, 400); }
    if (text(data?.version, 24) === VERSION) return saveV34(request, env, data);
    return v33Runtime.fetch(request, env, ctx);
  }
  const response = await v33Runtime.fetch(request, env, ctx);
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
