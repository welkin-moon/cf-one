import genderRuntime from './gender-runtime.js';

const VERSION = '3.2.0';

const EXTRA_QUESTIONS = [
  { id: 'em1', key: 'expression_masc', pair: 'em', text: '在没有外界要求时，我会自然选择更偏男性化的外表或呈现方式。' },
  { id: 'ef1', key: 'expression_fem', pair: 'ef', text: '在没有外界要求时，我会自然选择更偏女性化的外表或呈现方式。' },
  { id: 'rn1', key: 'rom_nb', pair: 'rn', text: '想象可能的恋爱对象时，非二元或性别多元的人也会自然进入我的考虑范围。' },
  { id: 'pn1', key: 'phys_nb', pair: 'pn', text: '我会对某些非二元或性别多元的人产生明显的身体或性吸引，而不只是欣赏外表。' },
  { id: 'lib1', key: 'libido', pair: 'lib', text: '即使不考虑具体对象，我也经常会体验到明显的性欲或性冲动。' },
  { id: 'rd1', key: 'romantic_desire', pair: 'rd', text: '即使没有特定喜欢的人，我也会向往拥有恋爱关系。' },
  { id: 'ro1', key: 'relationship_openness', text: '在双方充分知情并同意的前提下，我能接受伴侣关系不一定完全排他。' },
  { id: 'em2', key: 'expression_masc', text: '如果可以自由决定自己的穿着、发型或整体风格，我通常会希望它更偏男性化。' },
  { id: 'ef2', key: 'expression_fem', text: '如果可以自由决定自己的穿着、发型或整体风格，我通常会希望它更偏女性化。' },
  { id: 'rn2', key: 'rom_nb', text: '当某位非二元或性别多元的人让我很心动时，我会期待得到对方的特别关注，并有发展恋爱关系的可能。' },
  { id: 'pn2', key: 'phys_nb', text: '如果一位非二元或性别多元的人很符合我的偏好，我可能会希望和对方有身体或性层面的亲近。' },
  { id: 'lib2', key: 'libido', text: '在日常生活中，性方面的欲望会比较频繁地自然出现。' },
  { id: 'rd2', key: 'romantic_desire', text: '建立带有恋爱意味的亲密伴侣关系，对我来说通常有明显吸引力。' },
  { id: 'ro2', key: 'relationship_openness', pair: 'ro', text: '如果所有人都同意并且边界清楚，我可以想象自己处在开放式或多伴侣关系中。' },
  { id: 'em3', key: 'expression_masc', pair: 'em', text: '别人把我的整体气质或呈现理解为偏男性化时，我通常会觉得这种描述比较贴近。' },
  { id: 'ef3', key: 'expression_fem', pair: 'ef', text: '别人把我的整体气质或呈现理解为偏女性化时，我通常会觉得这种描述比较贴近。' },
  { id: 'rn3', key: 'rom_nb', pair: 'rn', text: '如果一位非二元或性别多元的人很符合我的偏好，我可能会希望和对方发展带有恋爱意味的亲密关系。' },
  { id: 'pn3', key: 'phys_nb', pair: 'pn', text: '看到某些符合我偏好的非二元或性别多元的人时，我会出现想和对方有更亲近身体接触的吸引感。' },
  { id: 'lib3', key: 'libido', text: '如果一段时间完全没有任何性方面的活动或释放，我通常会明显意识到这种需要。' },
  { id: 'rd3', key: 'romantic_desire', text: '想象未来生活时，有一位恋爱伴侣通常会让那个画面更符合我的期待。' },
  { id: 'ro3', key: 'relationship_openness', text: '对我来说，长期关系并不一定必须以“彼此只能有一个伴侣”为前提。' },
  { id: 'lib4', key: 'libido', pair: 'lib', text: '总体而言，我会把自己的性欲强度描述为比较高。' },
  { id: 'rd4', key: 'romantic_desire', pair: 'rd', text: '总体而言，我对恋爱关系本身有比较强的向往。' },
  { id: 'ro4', key: 'relationship_openness', pair: 'ro', text: '相比严格的一对一排他关系，我对协商一致的开放关系安排也有实际兴趣。' }
];

const BASELINE_EXTRA = String.raw`
<div class="field"><label>4. 你目前最常使用的浪漫取向身份描述是？</label><div class="grid" data-field="self_romantic_orientation"><button class="choice" data-value="异性浪漫" type="button">异性浪漫</button><button class="choice" data-value="同性浪漫" type="button">同性浪漫</button><button class="choice" data-value="双性浪漫/泛浪漫" type="button">双性浪漫 / 泛浪漫</button><button class="choice" data-value="无浪漫/灰浪漫" type="button">无浪漫 / 灰浪漫</button><button class="choice" data-value="酷儿/其他" type="button">酷儿 / 其他</button><button class="choice" data-value="不确定/不使用标签" type="button">不确定 / 不使用标签</button></div></div>
<div class="field"><label>7. 你的日常性别表达更接近哪里？</label><div class="note tiny">这里问的是外表、穿着、发型、气质等表达方式，不等于性别认同。</div><div class="likert" data-field="self_gender_expression"><button class="choice" data-value="1" type="button">强烈男性化</button><button class="choice" data-value="2" type="button">偏男性化</button><button class="choice" data-value="3" type="button">略偏男性化</button><button class="choice" data-value="4" type="button">中性 / 雌雄同体</button><button class="choice" data-value="5" type="button">略偏女性化</button><button class="choice" data-value="6" type="button">偏女性化</button><button class="choice" data-value="7" type="button">强烈女性化</button><button class="choice" data-value="NA" type="button">变化较大 / 不适用</button></div></div>
<div class="field"><label>8. 你自觉整体的身体/性吸引强度如何？</label><div class="likert" data-field="self_phys_intensity"><button class="choice" data-value="1" type="button">几乎没有</button><button class="choice" data-value="2" type="button">较低</button><button class="choice" data-value="3" type="button">中等</button><button class="choice" data-value="4" type="button">较强</button><button class="choice" data-value="5" type="button">很强</button></div></div>
<div class="field"><label>9. 不考虑具体对象时，你自觉自己的性欲 / 性冲动强度如何？</label><div class="likert" data-field="self_libido"><button class="choice" data-value="1" type="button">几乎没有</button><button class="choice" data-value="2" type="button">较低</button><button class="choice" data-value="3" type="button">中等</button><button class="choice" data-value="4" type="button">较强</button><button class="choice" data-value="5" type="button">很强</button></div></div>
<div class="field"><label>10. 你对“拥有恋爱关系本身”的向往有多强？</label><div class="likert" data-field="self_romantic_desire"><button class="choice" data-value="1" type="button">几乎没有</button><button class="choice" data-value="2" type="button">较低</button><button class="choice" data-value="3" type="button">中等</button><button class="choice" data-value="4" type="button">较强</button><button class="choice" data-value="5" type="button">很强</button></div></div>
<div class="field"><label>11. 如果只看个人偏好，你更喜欢怎样的关系结构？</label><div class="note tiny">这里只问偏好，不代表你当前实际处于哪种关系；开放或多伴侣均指所有相关方知情同意。</div><div class="likert" data-field="self_relationship_pref"><button class="choice" data-value="1" type="button">强烈偏好一对一排他</button><button class="choice" data-value="2" type="button">较偏一对一排他</button><button class="choice" data-value="3" type="button">开放 / 排他都可以</button><button class="choice" data-value="4" type="button">较偏开放或非排他</button><button class="choice" data-value="5" type="button">明显偏好多伴侣 / 多元关系</button><button class="choice" data-value="NA" type="button">不确定 / 其他</button></div></div>`;

const EXPANDED_CSS = String.raw`<style id="mf01sm-v32-expanded-ux">
#baseline .field>.note.tiny{margin:0 0 2px}.comparison{display:grid;gap:8px;margin-top:10px}.comparison-row{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(84px,.7fr) minmax(84px,.7fr) minmax(70px,.5fr);gap:8px;align-items:center;padding:9px 10px;border-radius:14px;background:var(--surface-3)}.comparison-row b{font-size:.88rem}.comparison-head{color:var(--muted);font-size:.78rem;background:transparent;padding-block:2px}.result-group-label{margin-top:8px;font-weight:800;color:var(--text)}@media(max-width:620px){.comparison-row{grid-template-columns:minmax(0,1fr) auto auto}.comparison-row span:last-child{grid-column:2/-1}.comparison-head{display:none}}
</style>`;

const EXPANDED_JS = String.raw`<script id="mf01sm-v32-baseline-guard">(()=>{const btn=document.getElementById('baselineNext');if(!btn)return;const required=['self_romantic_orientation','self_gender_expression','self_phys_intensity','self_libido','self_romantic_desire','self_relationship_pref'];btn.addEventListener('click',e=>{const missing=required.filter(k=>!state.selfLikert[k]);if(missing.length){e.stopImmediatePropagation();alert('请完成新增的自我报告项目；不确定的项目可以直接选择“不确定 / 其他”。');}},true);})();</script>`;

const FINISH_JS = String.raw`async function finish(){
const quality=responseQuality();
const scores={gender_aligned:scoreAxis('gender_aligned'),gender_cross:scoreAxis('gender_cross'),nonbinary:scoreAxis('nonbinary'),expression_masc:scoreAxis('expression_masc'),expression_fem:scoreAxis('expression_fem'),rom_m:scoreAxis('rom_m'),rom_f:scoreAxis('rom_f'),rom_nb:scoreAxis('rom_nb'),phys_m:scoreAxis('phys_m'),phys_f:scoreAxis('phys_f'),phys_nb:scoreAxis('phys_nb'),libido:scoreAxis('libido'),romantic_desire:scoreAxis('romantic_desire'),relationship_openness:scoreAxis('relationship_openness'),initiative:scoreAxis('initiative'),autonomy:scoreAxis('autonomy')};
scores.expression_position=Math.round(clamp(50+(scores.expression_fem-scores.expression_masc)/2));
scores.expression_balance=Math.round(clamp(100-Math.abs(scores.expression_fem-scores.expression_masc)));
scores.phys_overall=Math.max(scores.phys_m,scores.phys_f,scores.phys_nb);
scores.rom_overall=Math.max(scores.rom_m,scores.rom_f,scores.rom_nb);
scores.m=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;
scores.f=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;
scores.attr_m=Math.round((scores.rom_m+scores.phys_m)/2);scores.attr_f=Math.round((scores.rom_f+scores.phys_f)/2);scores.agender=scores.nonbinary;scores.ace=Math.round(clamp(100-scores.phys_overall));scores.top=scores.initiative;scores.bot=100-scores.initiative;scores.d=scores.autonomy;scores.s=100-scores.autonomy;scores.trans=Math.round(clamp(50+(scores.gender_cross-scores.gender_aligned)*.6));scores.pan=Math.round(clamp(Math.min(scores.attr_m,scores.attr_f)));scores.validity=quality.score;scores.response_quality=quality.score;scores.response_quality_detail=quality;scores.duration_ms=Date.now()-state.startedAt;
const map5=v=>{const n=Number(v);return n>=1&&n<=5?Math.round((n-1)/4*100):null;};const map7=v=>{const n=Number(v);return n>=1&&n<=7?Math.round((n-1)/6*100):null;};const cmp=(self,test)=>self===null?null:{self,test,gap:Math.abs(self-test)};scores.self_test_comparison={gender_expression:cmp(map7(state.selfLikert.self_gender_expression),scores.expression_position),sexual_attraction_intensity:cmp(map5(state.selfLikert.self_phys_intensity),scores.phys_overall),libido:cmp(map5(state.selfLikert.self_libido),scores.libido),romantic_desire:cmp(map5(state.selfLikert.self_romantic_desire),scores.romantic_desire),relationship_openness:cmp(map5(state.selfLikert.self_relationship_pref),scores.relationship_openness)};const validCmp=Object.values(scores.self_test_comparison).filter(Boolean);scores.self_test_comparison.mean_absolute_gap=validCmp.length?Math.round(validCmp.reduce((a,x)=>a+x.gap,0)/validCmp.length):null;
scores._schema='assigned-sex-v3.2-expanded-profile';scores._scoring='unweighted-subscale-means';scores._legacy_composites=['m','f','attr_m','attr_f','agender','ace','top','bot','d','s','trans','pan','validity'];scores._answers=Object.fromEntries(QUESTIONS.map((q,i)=>[q.id,state.answers[i]]));scores._self_report={...state.selfLikert};
const oldResult=buildResult(scores,quality);const gp=genderProfile(scores);const gpLabel=gp==='CROSS'?'跨指派性别方向较强':gp==='ALIGNED'?'指派性别一致方向较强':gp==='NONBINARY'?'非二元适配方向较强':gp==='BOTH'?'两种二元方向都较强':'性别方向较混合';const targetSummary=kind=>{const list=[['男',scores[kind+'_m']],['女',scores[kind+'_f']],['非二元/性别多元',scores[kind+'_nb']]];const max=Math.max(...list.map(x=>x[1]));if(max<38)return'整体较低';const near=list.filter(x=>x[1]>=56&&max-x[1]<=16).map(x=>x[0]);return near.length?near.join('/')+'较明显':list.sort((a,b)=>b[1]-a[1])[0][0]+'略高';};const romSummary=targetSummary('rom'),physSummary=targetSummary('phys');$('#resultTitle').textContent=gpLabel+' · 浪漫 '+romSummary+' · 身体 '+physSummary;
const attractionBody='浪漫吸引：男 '+scores.rom_m+'、女 '+scores.rom_f+'、非二元/性别多元 '+scores.rom_nb+'；身体/性吸引：男 '+scores.phys_m+'、女 '+scores.phys_f+'、非二元/性别多元 '+scores.phys_nb+'。三个对象方向分别保留，不自动压成一个取向标签。';
const exprDiff=scores.expression_fem-scores.expression_masc;const exprText=Math.abs(exprDiff)<=12?(scores.expression_masc<38&&scores.expression_fem<38?'性别表达整体没有明显男性化或女性化倾向。':'男性化与女性化表达得分接近，可能更中性、雌雄同体或随情境变化。'):(exprDiff>0?'性别表达整体更偏女性化。':'性别表达整体更偏男性化。');
const level=v=>v>=62?'较强':v<=38?'较低':'中等';const desireBody='性欲/性冲动 '+scores.libido+'（'+level(scores.libido)+'）；对恋爱关系本身的向往 '+scores.romantic_desire+'（'+level(scores.romantic_desire)+'）；关系结构开放度 '+scores.relationship_openness+'（'+(scores.relationship_openness>=62?'更能接受或偏好协商一致的非排他关系':scores.relationship_openness<=38?'更偏好一对一排他关系':'排他与开放之间较灵活')+'）。';
const labels={gender_expression:'性别表达位置',sexual_attraction_intensity:'身体/性吸引强度',libido:'性欲/性冲动',romantic_desire:'恋爱关系向往',relationship_openness:'关系结构开放度'};let compareRows='<div class="comparison"><div class="comparison-row comparison-head"><b>维度</b><span>自评</span><span>量表</span><span>差值</span></div>';for(const [k,v] of Object.entries(scores.self_test_comparison)){if(k==='mean_absolute_gap'||!v)continue;compareRows+='<div class="comparison-row"><b>'+labels[k]+'</b><span>'+v.self+'</span><span>'+v.test+'</span><span>Δ '+v.gap+'</span></div>';}compareRows+='</div>';const qualityClass=quality.score>=80?'good':quality.score>=60?'mid':'low';
$('#analysis').innerHTML='<div class="result-block"><b>性别方向</b><p>'+oldResult.genderBody+'</p></div><div class="result-block"><b>性别表达</b><p>'+exprText+' 男性化 '+scores.expression_masc+'，女性化 '+scores.expression_fem+'，合成位置 '+scores.expression_position+'/100（0 更男性化，100 更女性化）。</p></div><div class="result-block"><b>吸引对象与强度</b><p>'+attractionBody+'</p></div><div class="result-block"><b>欲望与关系结构</b><p>'+desireBody+'</p></div><div class="result-block"><b>关系互动</b><p>'+oldResult.relationBody+'</p></div><div class="result-block"><b>自评与量表的关系</b><p>下面只比较能够映射到同一连续轴的自评项目。差值不是“真假”或效度判定，只用于观察自我定位与题目反应是否趋同。'+(scores.self_test_comparison.mean_absolute_gap===null?'':' 平均绝对差值 '+scores.self_test_comparison.mean_absolute_gap+'。')+'</p>'+compareRows+'</div><div class="result-block"><b>作答质量提示</b><p class="quality '+qualityClass+'">'+quality.score+'/100（'+oldResult.qualityLabel+'）。注意力检查 '+quality.attention_passed+'/'+quality.attention_total+'，语义平行题一致度 '+quality.pair_score+'/100。'+(quality.score<60?'本次结果建议只作低置信度参考。':'该分数用于识别明显的随意作答，不是心理学“效度分”。')+'</p></div>';
const bars=[['指派性别一致',scores.gender_aligned],['跨指派性别',scores.gender_cross],['非二元适配',scores.nonbinary],['表达·男性化',scores.expression_masc],['表达·女性化',scores.expression_fem],['男性浪漫吸引',scores.rom_m],['女性浪漫吸引',scores.rom_f],['非二元浪漫吸引',scores.rom_nb],['男性身体/性吸引',scores.phys_m],['女性身体/性吸引',scores.phys_f],['非二元身体/性吸引',scores.phys_nb],['性欲/性冲动',scores.libido],['恋爱关系向往',scores.romantic_desire],['关系结构开放度',scores.relationship_openness],['主动推进',scores.initiative],['自主掌控',scores.autonomy]];$('#bars').replaceChildren();bars.forEach(pair=>{const row=document.createElement('div');row.className='barrow';row.innerHTML='<span>'+pair[0]+'</span><span class="bartrack"><span style="width:'+pair[1]+'%"></span></span><b>'+pair[1]+'</b>';$('#bars').appendChild(row);});show('result');try{await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:VERSION,nickname:state.nickname,age:state.age,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfLikert:state.selfLikert,location:state.location,gender:state.assignGender,tag:$('#resultTitle').textContent,scores,timestamp:Date.now()})});}catch(e){console.error('Archive Failed',e);}}
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

async function saveRecord(request, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > 256000) return json({ error: 'payload too large' }, 413);
  let data;
  try { data = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);
  const nickname = text(data.nickname, 80);
  const age = Number(data.age);
  const assignGender = data.gender === 'AMAB' || data.gender === 'AFAB' ? data.gender : '';
  if (!nickname || !Number.isInteger(age) || age < 13 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const scores = parseObject(data.scores);
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
  } catch (error) { console.error('mf01sm.v32-d1-save', error); }
  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version: VERSION, nickname, age, gender: assignGender, location, ip, d1_synced: false, timestamp }));
    return json({ success: true, d1: false, kv: true, version: VERSION });
  } catch (error) {
    console.error('mf01sm.v32-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

function interleaveQuestions(base) {
  const out = [];
  let extra = 0;
  for (let i = 0; i < base.length; i++) {
    out.push(base[i]);
    if ((i + 1) % 2 === 0 && extra < EXTRA_QUESTIONS.length) out.push(EXTRA_QUESTIONS[extra++]);
  }
  while (extra < EXTRA_QUESTIONS.length) out.push(EXTRA_QUESTIONS[extra++]);
  return out;
}

function patchMain(html) {
  html = html.replaceAll('3.1.1', VERSION).replace('<title>认知与取向测试 · v3.1</title>', '<title>认知与取向测试 · v3.2</title>').replace('0–100 是 v3.1 内部等权子量表分数', '0–100 是 v3.2 内部等权子量表分数');
  html = html.replace('3. 你目前最常使用的取向身份描述是？', '3. 你目前最常使用的性 / 身体吸引取向身份描述是？');
  const actionMarker = '<div class="actions"><button id="baselineNext"';
  if (html.includes(actionMarker) && !html.includes('self_gender_expression')) html = html.replace(actionMarker, `${BASELINE_EXTRA}<div class="actions"><button id="baselineNext"`);
  const qStart = html.indexOf('const QUESTIONS=');
  const qEnd = qStart >= 0 ? html.indexOf(';const LABELS=', qStart) : -1;
  if (qStart >= 0 && qEnd > qStart) {
    try {
      const raw = html.slice(qStart + 'const QUESTIONS='.length, qEnd);
      const base = JSON.parse(raw);
      html = html.slice(0, qStart) + `const QUESTIONS=${JSON.stringify(interleaveQuestions(base))}` + html.slice(qEnd);
    } catch (error) { console.error('mf01sm.v32-question-patch', error); }
  }
  const finishStart = html.indexOf('async function finish(){');
  const finishEnd = finishStart >= 0 ? html.indexOf('</script>', finishStart) : -1;
  if (finishStart >= 0 && finishEnd > finishStart) html = html.slice(0, finishStart) + FINISH_JS + html.slice(finishEnd);
  html = html.replace('</head>', `${EXPANDED_CSS}</head>`).replace('</body>', `${EXPANDED_JS}</body>`);
  return html;
}

function patchAdmin(html) {
  const marker = "let scoreText;if(String(item.version||'').startsWith('3.1')){";
  const branch = "let scoreText;if(String(item.version||'').startsWith('3.2')){scoreText='一致:'+Math.round(sc.gender_aligned||0)+' 跨:'+Math.round(sc.gender_cross||0)+' NB:'+Math.round(sc.nonbinary||0)+' | 表M:'+Math.round(sc.expression_masc||0)+' 表F:'+Math.round(sc.expression_fem||0)+' | 浪M:'+Math.round(sc.rom_m||0)+' 浪F:'+Math.round(sc.rom_f||0)+' 浪NB:'+Math.round(sc.rom_nb||0)+' | 身M:'+Math.round(sc.phys_m||0)+' 身F:'+Math.round(sc.phys_f||0)+' 身NB:'+Math.round(sc.phys_nb||0)+' | 欲:'+Math.round(sc.libido||0)+' 恋:'+Math.round(sc.romantic_desire||0)+' 开:'+Math.round(sc.relationship_openness||0)+' | 主动:'+Math.round(sc.initiative||0)+' 自主:'+Math.round(sc.autonomy||0)+' | 质量:'+Math.round(sc.response_quality||0)+' 注:'+Math.round((sc.response_quality_detail||{}).attention_passed||0)+'/'+Math.round((sc.response_quality_detail||{}).attention_total||0)+' 平行:'+Math.round((sc.response_quality_detail||{}).pair_score||0)+' 速:'+Math.round((sc.response_quality_detail||{}).ms_per_item||0)+'ms/题';}else if(String(item.version||'').startsWith('3.1')){";
  return html.replace(marker, branch);
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/api/save') return saveRecord(request, env);
  const response = await genderRuntime.fetch(request, env, ctx);
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
