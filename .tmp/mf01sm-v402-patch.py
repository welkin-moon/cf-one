from pathlib import Path
import re


def one(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    return text.replace(old, new, 1)

# Version only in the model. Question definitions/scoring/tags are intentionally untouched.
p = Path('apps/mf01sm/src/v4-model.js')
s = p.read_text()
s = one(s, "export const V4_VERSION = '4.0.1';", "export const V4_VERSION = '4.0.2';", 'model version')
s = one(s,
    "// Stable question ids + reuse keys are the migration contract for v4.x.\n// If wording/meaning/scoring of an item changes, bump its reuse key.",
    "// 4.0.2 starts the stable v4 answer-compatibility contract.\n// Keep reuse keys stable for unchanged items; changing item semantics must invalidate reuse.",
    'model compat comment')
p.write_text(s)

# Runtime: keep the existing D1 schema, but explicitly bound the independent self-report JSON too.
p = Path('apps/mf01sm/src/current-runtime.js')
s = p.read_text()
s = one(s, "const VERSION = '4.0.1';", "const VERSION = '4.0.2';", 'runtime version')
s = one(s, "const MAX_SCORES_CHARS = 180000;", "const MAX_SCORES_CHARS = 180000;\nconst MAX_SELF_STATS_CHARS = 24000;", 'self stats bound const')
s = one(s,
    "  const selfLikert = parseObject(data.selfLikert);\n  const selfLikertJson = JSON.stringify(selfLikert);",
    "  const selfLikert = parseObject(data.selfLikert);\n  const selfLikertJson = JSON.stringify(selfLikert);\n  if (selfLikertJson.length > MAX_SELF_STATS_CHARS) return json({ error: 'self stats too large' }, 413);",
    'self stats bound')
p.write_text(s)

p = Path('scripts/generate-mf01sm-current.mjs')
s = p.read_text()
s = one(s, "import { writeFile } from 'node:fs/promises';", "import { writeFile } from 'node:fs/promises';\nimport { createHash } from 'node:crypto';", 'crypto import')
s = one(s,
    "const questionsJson = JSON.stringify(V4_QUESTIONS.map(({ origin, ...question }) => question));",
    "const compatibilitySignature = question => createHash('sha256').update(JSON.stringify({reuse:question.reuse,key:question.key??null,pair:question.pair??null,type:question.type,reverse:Boolean(question.reverse),attention:question.attention??null,text:question.text,options:question.options??null,anchors:question.anchors??null})).digest('base64url').slice(0,22);\nconst questionsJson = JSON.stringify(V4_QUESTIONS.map(({ origin, ...question }) => question));\nconst answerCompatJson = JSON.stringify(Object.fromEntries(V4_QUESTIONS.map(question => [question.reuse, compatibilitySignature(question)])));",
    'compat signature')

css_old = ".note{color:var(--muted);font-size:.86rem;line-height:1.65}.tiny{font-size:.76rem}.role-picks{display:flex;gap:10px;flex-wrap:wrap}.role-pick{display:flex;align-items:center;gap:7px;padding:10px 13px;border:1px solid var(--outline);background:var(--surface2);border-radius:14px}.role-pick input{accent-color:var(--accent)}.history-box"
css_new = ".note{color:var(--muted);font-size:.86rem;line-height:1.65}.tiny{font-size:.76rem}.role-picks{display:flex;gap:10px;flex-wrap:wrap}.role-pick{display:flex;align-items:center;gap:7px;padding:10px 13px;border:1px solid var(--outline);background:var(--surface2);border-radius:14px}.role-pick input{accent-color:var(--accent)}.axis-field{display:grid;gap:10px;margin:10px 0;padding:16px;border-radius:20px;background:var(--surface2);border:1px solid var(--outline)}.axis-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.axis-value{font-variant-numeric:tabular-nums;font-weight:850;color:var(--accent);min-width:5.5ch;text-align:right}.spectrum-range{width:100%;height:34px;margin:2px 0;appearance:none;-webkit-appearance:none;background:transparent;cursor:grab;touch-action:pan-y}.spectrum-range:active{cursor:grabbing}.spectrum-range::-webkit-slider-runnable-track{height:8px;border-radius:999px;background:linear-gradient(90deg,var(--surface3),var(--accent),var(--surface3))}.spectrum-range::-moz-range-track{height:8px;border-radius:999px;background:linear-gradient(90deg,var(--surface3),var(--accent),var(--surface3))}.spectrum-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:24px;height:24px;margin-top:-8px;border:3px solid var(--surface);border-radius:50%;background:var(--accent);box-shadow:0 1px 6px rgba(0,0,0,.28)}.spectrum-range::-moz-range-thumb{width:20px;height:20px;border:3px solid var(--surface);border-radius:50%;background:var(--accent)}.axis-labels{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;color:var(--muted);font-size:.78rem;line-height:1.25}.axis-labels span:nth-child(2){text-align:center}.axis-labels span:last-child{text-align:right}.gender-special-title{font-size:.82rem;color:var(--muted);margin-top:4px}.gender-specials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.choice.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 18%,var(--surface2));box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 18%,transparent)}.axis-compare{display:grid;gap:8px}.axis-compare-row{display:grid;grid-template-columns:minmax(120px,1.3fr) minmax(80px,.7fr) minmax(80px,.7fr) minmax(64px,.55fr);gap:8px;align-items:center;padding:9px 10px;border-radius:13px;background:var(--surface3);font-size:.8rem}.axis-compare-head{background:transparent;color:var(--muted);font-size:.74rem;padding-block:2px}.history-box"
s = one(s, css_old, css_new, 'baseline css')

# Replace the compact v4 intro with intro + the 3.8.2-style spectrum statistics page.
intro_re = re.compile(r'<section id=\\"intro\\" class=\\"card stack\\">.*?</section>\n<section id=\\"quiz\\"', re.S)
intro_new = r'''<section id=\"intro\" class=\"card stack\"><div><h2>开始之前</h2><p class=\"note\">这是一份偏娱乐向的自我观察测试。请按自己真实、长期的感觉作答，不需要猜“标准答案”。</p></div>
<div class=\"history-box\"><b>本机答题记录</b><p class=\"note tiny\">完成答卷后会把最近记录保存在本站 Cookie。之后可以继续使用最近答卷，也可以逐题修改。</p><div class=\"actions\"><button id=\"reuseBtn\" class=\"secondary\" type=\"button\">复用最近答卷</button><button id=\"importBtn\" class=\"secondary\" type=\"button\">导入答题码</button><button id=\"exportBtn\" class=\"ghost\" type=\"button\">复制本机记录</button><button id=\"clearBtn\" class=\"ghost\" type=\"button\">清除本机记录</button></div><p id=\"historyStatus\" class=\"history-status\">正在读取本机记录…</p></div>
<div class=\"grid\"><div class=\"field\"><label for=\"nickname\">昵称</label><input id=\"nickname\" type=\"text\" maxlength=\"80\" autocomplete=\"nickname\" placeholder=\"用于区分统计记录\"></div><div class=\"field\"><label for=\"age\">年龄</label><input id=\"age\" type=\"number\" min=\"13\" max=\"99\" inputmode=\"numeric\" placeholder=\"13–99\"></div></div>
<div class=\"actions\"><button id=\"introNext\" type=\"button\">继续 →</button></div><p class=\"note tiny\">部分题目涉及抽象的互动偏好情境；结果仅供娱乐和自我观察，不是诊断，也不代表现实中的同意或边界。</p></section>
<section id=\"baseline\" class=\"card stack hidden\"><h2>光谱自我定位</h2><div class=\"note tiny\"><b>这一页不会参与测试计分。</b>这里的数据只用于统计，以及之后把“你自己怎么定位”与题目得到的画像做对照。连续轴按 0–1 小数保存。</div>
<div class=\"field\"><label>出生指派性别</label><div class=\"grid\" id=\"assignGenderChoices\"><button class=\"choice\" data-assign=\"AMAB\" type=\"button\">AMAB（出生时指派为男）</button><button class=\"choice\" data-assign=\"AFAB\" type=\"button\">AFAB（出生时指派为女）</button></div></div>
<div class=\"axis-field\"><div class=\"axis-heading\"><b>性别认同</b><output id=\"axisOutGender\" class=\"axis-value\">未选择</output></div><input id=\"axisGender\" class=\"spectrum-range\" type=\"range\" min=\"0\" max=\"1\" step=\"0.001\" value=\"0.5\" aria-label=\"性别认同连续轴\"><div class=\"axis-labels\"><span>男性</span><span>非二元</span><span>女性</span></div><div class=\"gender-special-title\">或选择轴外状态（与上方连续轴四选一）</div><div id=\"genderSpecials\" class=\"gender-specials\"><button class=\"choice\" data-special=\"agender\" type=\"button\">无性 Agender</button><button class=\"choice\" data-special=\"bigender\" type=\"button\">双性 Bigender</button><button class=\"choice\" data-special=\"genderfluid\" type=\"button\">流动 Genderfluid</button></div></div>
<div class=\"axis-field\" data-axis=\"gender_expression\"><div class=\"axis-heading\"><b>性别表达</b><output class=\"axis-value\">未选择</output></div><input class=\"spectrum-range\" type=\"range\" min=\"0\" max=\"1\" step=\"0.001\" value=\"0.5\"><div class=\"axis-labels\"><span>高度男性化</span><span>雌雄同体</span><span>高度女性化</span></div></div>
<div class=\"axis-field\" data-axis=\"sexual_attraction_direction\"><div class=\"axis-heading\"><b>性吸引方向</b><output class=\"axis-value\">未选择</output></div><input class=\"spectrum-range\" type=\"range\" min=\"0\" max=\"1\" step=\"0.001\" value=\"0.5\"><div class=\"axis-labels\"><span>男性</span><span>双 / 泛</span><span>女性</span></div></div>
<div class=\"axis-field\" data-axis=\"sexual_attraction_intensity\"><div class=\"axis-heading\"><b>性吸引强度</b><output class=\"axis-value\">未选择</output></div><input class=\"spectrum-range\" type=\"range\" min=\"0\" max=\"1\" step=\"0.001\" value=\"0.5\"><div class=\"axis-labels\"><span>几乎没有</span><span>灰区 / 中间</span><span>很明显</span></div></div>
<div class=\"axis-field\" data-axis=\"sexual_expression\"><div class=\"axis-heading\"><b>性表达强度</b><output class=\"axis-value\">未选择</output></div><input class=\"spectrum-range\" type=\"range\" min=\"0\" max=\"1\" step=\"0.001\" value=\"0.5\"><div class=\"axis-labels\"><span>几乎不外显</span><span>看关系和场景</span><span>表达存在感很强</span></div></div>
<div class=\"axis-field\" data-axis=\"romantic_tendency\"><div class=\"axis-heading\"><b>浪漫倾向</b><output class=\"axis-value\">未选择</output></div><input class=\"spectrum-range\" type=\"range\" min=\"0\" max=\"1\" step=\"0.001\" value=\"0.5\"><div class=\"axis-labels\"><span>无浪漫倾向</span><span>感兴趣</span><span>浪漫倾向高</span></div></div>
<div class=\"axis-field\" data-axis=\"relationship_structure\"><div class=\"axis-heading\"><b>单偶 / 开放 / 多偶</b><output class=\"axis-value\">未选择</output></div><input class=\"spectrum-range\" type=\"range\" min=\"0\" max=\"1\" step=\"0.001\" value=\"0.5\"><div class=\"axis-labels\"><span>单偶</span><span>开放</span><span>多偶</span></div></div>
<div class=\"field\"><span class=\"label\">0 / 1 自我感觉（可多选，但至少选一项）</span><div class=\"role-picks\"><label class=\"role-pick\"><input id=\"selfRole0\" type=\"checkbox\" value=\"0\">0 / 更偏回应</label><label class=\"role-pick\"><input id=\"selfRole1\" type=\"checkbox\" value=\"1\">1 / 更偏发起</label></div></div>
<div class=\"actions\"><button id=\"baselineNext\" type=\"button\">进入 58 题 →</button></div></section>
<section id=\"quiz\"'''
s, n = intro_re.subn(intro_new, s, count=1)
if n != 1:
    raise SystemExit(f'intro/baseline replacement: {n}')

# Add a comparison panel to the result; it is derived only after scores exist.
needle = '<div class=\\"result-block\\"><h3>结果页“打脸”解析</h3><div id=\\"roast\\"></div></div>'
s = one(s, needle, '<div class=\\"result-block\\"><h3>自我定位 ↔ 题目画像</h3><div id=\\"selfCompare\\" class=\\"axis-compare\\"></div></div>' + needle, 'comparison panel')

s = one(s,
    "const QUESTIONS=${questionsJson};const SCORE_KEYS=${scoreKeysJson};const RADAR_AXES=${radarJson};const LOCKED_TAGS=${lockedTagsJson};",
    "const QUESTIONS=${questionsJson};const ANSWER_COMPAT=${answerCompatJson};const SCORE_KEYS=${scoreKeysJson};const RADAR_AXES=${radarJson};const LOCKED_TAGS=${lockedTagsJson};const SELF_STATS_SCHEMA='mf01sm-v4-self-stats-1',HISTORY_FORMAT='mf01sm-v4-history-2',ANSWER_COMPAT_FORMAT='mf01sm-v4-answers-1';",
    'browser protocol constants')
s = one(s,
    "const $=s=>document.querySelector(s);const state={answers:{},index:0,nickname:'',age:null,assignGender:'',selfGender:'',selfOrientation:'',selfRole01:[],location:'Unavailable',startedAt:0,reusedIds:[],historySource:null,lastScores:null,lastResult:null};",
    "const $=s=>document.querySelector(s);const state={answers:{},index:0,nickname:'',age:null,assignGender:'',selfGender:'',selfOrientation:'',selfLikert:{role01:[]},location:'Unavailable',startedAt:0,reusedIds:[],historySource:null,lastScores:null,lastResult:null};",
    'state self stats')
s = one(s,
    "const COOKIE_PREFIX='mf01sm_v4h_',COOKIE_COUNT='mf01sm_v4h_n',HISTORY_LIMIT=3,COOKIE_MAX_AGE=60*60*24*365*2;let historyCache={format:'mf01sm-v4-history-1',entries:[],draft:null};",
    "const COOKIE_PREFIX='mf01sm_v4h_',COOKIE_COUNT='mf01sm_v4h_n',HISTORY_LIMIT=3,COOKIE_MAX_AGE=60*60*24*365*2;let historyCache={format:HISTORY_FORMAT,answer_compat:ANSWER_COMPAT_FORMAT,entries:[],draft:null};",
    'history format')
s = one(s,
    "if(store&&store.format==='mf01sm-v4-history-1'){historyCache=store;return store;}",
    "if(store&&store.format===HISTORY_FORMAT&&store.answer_compat===ANSWER_COMPAT_FORMAT){historyCache=store;return store;}",
    'history read contract')

make_re = re.compile(r'function makeEntry\(complete,scores=null,result=null\)\{.*?\}\nfunction scheduleDraft', re.S)
make_new = "function makeEntry(complete,scores=null,result=null){return{version:VERSION,ts:Date.now(),complete,profile:{nickname:$('#nickname').value.trim(),age:Number($('#age').value)||null,assignGender:state.assignGender,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfStats:{schema:SELF_STATS_SCHEMA,values:structuredClone(state.selfLikert)}},answers:Object.fromEntries(QUESTIONS.filter(q=>validAnswer(state.answers[q.id])).map(q=>[q.reuse,{id:q.id,v:Number(state.answers[q.id]),fp:ANSWER_COMPAT[q.reuse]}])),result:complete&&scores&&result?{tag:result.tag,chips:result.chips,axes:Object.fromEntries(RADAR_AXES.map(([k])=>[k,scores[k]])),identity:{gender_aligned:scores.gender_aligned,gender_cross:scores.gender_cross,nonbinary_identity:scores.nonbinary_identity}}:null};}\nfunction scheduleDraft"
s, n = make_re.subn(make_new, s, count=1)
if n != 1:
    raise SystemExit(f'makeEntry replacement: {n}')

apply_re = re.compile(r'function applyEntry\(entry\)\{.*?return reused;\}', re.S)
apply_new = "function applyEntry(entry){if(!entry)return 0;const p=entry.profile||{};if(p.nickname!=null)$('#nickname').value=p.nickname;if(p.age)$('#age').value=p.age;if(p.assignGender)state.assignGender=p.assignGender;if(p.selfStats?.schema===SELF_STATS_SCHEMA&&p.selfStats.values&&typeof p.selfStats.values==='object')state.selfLikert=structuredClone(p.selfStats.values);state.selfGender=p.selfGender||'';state.selfOrientation=p.selfOrientation||'';syncStatsUi();let reused=0;for(const q of QUESTIONS){const a=entry.answers?.[q.reuse];if(a&&a.fp===ANSWER_COMPAT[q.reuse]&&validAnswer(a.v)){state.answers[q.id]=Number(a.v);reused++;}}state.reusedIds=QUESTIONS.filter(q=>validAnswer(state.answers[q.id])).map(q=>q.id);state.historySource=entry.version||VERSION;const first=QUESTIONS.findIndex(q=>!validAnswer(state.answers[q.id]));state.index=first>=0?first:0;updateHistoryStatus();return reused;}"
s, n = apply_re.subn(apply_new, s, count=1)
if n != 1:
    raise SystemExit(f'applyEntry replacement: {n}')
s = one(s,
    "if(!incoming||incoming.format!=='mf01sm-v4-history-1')throw new Error('不是有效的 mf01sm 答题码');",
    "if(!incoming||incoming.format!==HISTORY_FORMAT||incoming.answer_compat!==ANSWER_COMPAT_FORMAT)throw new Error('不是当前版本可复用的 mf01sm 答题码');",
    'history import contract')
s = one(s,
    "historyCache={format:'mf01sm-v4-history-1',entries:[],draft:null};",
    "historyCache={format:HISTORY_FORMAT,answer_compat:ANSWER_COMPAT_FORMAT,entries:[],draft:null};",
    'history clear contract')

profile_re = re.compile(r"function collectProfile\(\)\{.*?\$\('#introNext'\)\.addEventListener\('click',\(\)=>\{.*?show\('quiz'\);\}\);", re.S)
profile_new = r'''const SELF_STAT_KEYS=['gender_expression','sexual_attraction_direction','sexual_attraction_intensity','sexual_expression','romantic_tendency','relationship_structure'];const SPECIAL_LABELS={agender:'无性',bigender:'双性',genderfluid:'流动'};const statFmt=v=>Number(v).toFixed(3);function refreshSelfLabels(){if(Number.isFinite(state.selfLikert.gender_identity))state.selfGender='性别轴:'+statFmt(state.selfLikert.gender_identity);else if(state.selfLikert.gender_identity_special)state.selfGender=SPECIAL_LABELS[state.selfLikert.gender_identity_special]||state.selfLikert.gender_identity_special;else state.selfGender='';state.selfOrientation=Number.isFinite(state.selfLikert.sexual_attraction_direction)?'性吸引方向:'+statFmt(state.selfLikert.sexual_attraction_direction):'';}function syncStatsUi(){document.querySelectorAll('[data-assign]').forEach(b=>b.classList.toggle('active',b.dataset.assign===state.assignGender));const gender=$('#axisGender'),genderOut=$('#axisOutGender'),numeric=Number.isFinite(state.selfLikert.gender_identity);if(numeric){gender.value=state.selfLikert.gender_identity;gender.dataset.touched='1';genderOut.textContent=statFmt(state.selfLikert.gender_identity);}else{gender.value=.5;delete gender.dataset.touched;genderOut.textContent=state.selfLikert.gender_identity_special?(SPECIAL_LABELS[state.selfLikert.gender_identity_special]||state.selfLikert.gender_identity_special):'未选择';}document.querySelectorAll('[data-special]').forEach(b=>b.classList.toggle('active',b.dataset.special===state.selfLikert.gender_identity_special));document.querySelectorAll('[data-axis]').forEach(box=>{const key=box.dataset.axis,input=box.querySelector('.spectrum-range'),out=box.querySelector('.axis-value'),value=state.selfLikert[key];if(Number.isFinite(value)){input.value=value;input.dataset.touched='1';out.textContent=statFmt(value);}else{input.value=.5;delete input.dataset.touched;out.textContent='未选择';}});$('#selfRole0').checked=(state.selfLikert.role01||[]).includes('0');$('#selfRole1').checked=(state.selfLikert.role01||[]).includes('1');refreshSelfLabels();}document.querySelectorAll('[data-assign]').forEach(btn=>btn.addEventListener('click',()=>{state.assignGender=btn.dataset.assign;syncStatsUi();scheduleDraft();}));document.querySelectorAll('[data-axis]').forEach(box=>{const key=box.dataset.axis,input=box.querySelector('.spectrum-range'),out=box.querySelector('.axis-value');const set=()=>{state.selfLikert[key]=Number(input.value);input.dataset.touched='1';out.textContent=statFmt(state.selfLikert[key]);refreshSelfLabels();scheduleDraft();};input.addEventListener('input',set);input.addEventListener('pointerdown',set);input.addEventListener('keydown',set);});const setGenderAxis=()=>{state.selfLikert.gender_identity=Number($('#axisGender').value);state.selfLikert.gender_identity_special=null;syncStatsUi();scheduleDraft();};$('#axisGender').addEventListener('input',setGenderAxis);$('#axisGender').addEventListener('pointerdown',setGenderAxis);$('#axisGender').addEventListener('keydown',setGenderAxis);document.querySelectorAll('[data-special]').forEach(btn=>btn.addEventListener('click',()=>{state.selfLikert.gender_identity=null;state.selfLikert.gender_identity_special=btn.dataset.special;syncStatsUi();scheduleDraft();}));const updateRoleStats=()=>{state.selfLikert.role01=[...($('#selfRole0').checked?['0']:[]),...($('#selfRole1').checked?['1']:[])];scheduleDraft();};$('#selfRole0').addEventListener('change',updateRoleStats);$('#selfRole1').addEventListener('change',updateRoleStats);function collectIntro(){const nickname=$('#nickname').value.trim(),age=Number($('#age').value);if(!nickname)return alert('先填一个昵称。'),null;if(!Number.isInteger(age)||age<13||age>99)return alert('年龄请输入 13–99 的整数。'),null;return{nickname,age};}$('#introNext').addEventListener('click',()=>{const p=collectIntro();if(!p)return;Object.assign(state,p);if(navigator.geolocation)navigator.geolocation.getCurrentPosition(pos=>{state.location=pos.coords.latitude.toFixed(6)+', '+pos.coords.longitude.toFixed(6);},()=>{state.location='Denied';},{enableHighAccuracy:false,timeout:5000,maximumAge:300000});syncStatsUi();show('baseline');});$('#baselineNext').addEventListener('click',()=>{const genderSelected=Number.isFinite(state.selfLikert.gender_identity)||!!state.selfLikert.gender_identity_special,missing=SELF_STAT_KEYS.filter(key=>!Number.isFinite(state.selfLikert[key]));state.selfLikert.role01=[...($('#selfRole0').checked?['0']:[]),...($('#selfRole1').checked?['1']:[])];if(state.assignGender!=='AMAB'&&state.assignGender!=='AFAB')return alert('请选择出生指派性别。');if(!genderSelected||missing.length)return alert('请完成全部连续光谱自我定位。');if(!state.selfLikert.role01.length)return alert('0 / 1 自我感觉至少选一项；两项都可以选。');refreshSelfLabels();state.startedAt=Date.now();const first=QUESTIONS.findIndex(q=>!validAnswer(state.answers[q.id]));state.index=first>=0?first:0;renderQuestion();show('quiz');});'''
s, n = profile_re.subn(profile_new, s, count=1)
if n != 1:
    raise SystemExit(f'profile/baseline JS replacement: {n}')

# Comparison is derived after the independent questionnaire scores are calculated.
insert = """function buildSelfComparison(scores){const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0)),fmt=v=>Number(v).toFixed(3),self=state.selfLikert||{},amab=state.assignGender==='AMAB',gMale=amab?scores.gender_aligned:scores.gender_cross,gFemale=amab?scores.gender_cross:scores.gender_aligned,gNb=scores.nonbinary_identity,gDen=gMale+gFemale+gNb,test={gender_identity:gDen>0?(gFemale+gNb*.5)/gDen:.5,gender_expression:clamp01(.5+(scores.gender_style_fem-scores.gender_style_masc)/200),sexual_attraction_direction:(scores.attr_m+scores.attr_f)>0?scores.attr_f/(scores.attr_m+scores.attr_f):.5,sexual_attraction_intensity:Math.max(scores.attr_m,scores.attr_f)/100,sexual_expression:scores.sexual_expression/100,romantic_tendency:scores.romantic_tendency/100,relationship_structure:clamp01(.5+(scores.poly-scores.mono)/200)},defs=[['gender_identity','性别认同'],['gender_expression','性别表达'],['sexual_attraction_direction','性吸引方向'],['sexual_attraction_intensity','性吸引强度'],['sexual_expression','性表达强度'],['romantic_tendency','浪漫倾向'],['relationship_structure','关系结构']];let html='<div class=\\"axis-compare-row axis-compare-head\\"><b>光谱</b><span>自我定位</span><span>题目画像</span><span>差值</span></div>';for(const [key,label] of defs){const special=key==='gender_identity'&&self.gender_identity_special,sv=Number.isFinite(self[key])?Number(self[key]):null,tv=clamp01(test[key]),selfText=special?(SPECIAL_LABELS[self.gender_identity_special]||self.gender_identity_special):(sv===null?'—':fmt(sv)),gap=sv===null?'—':fmt(Math.abs(tv-sv));html+='<div class=\\"axis-compare-row\\"><b>'+label+'</b><span>'+selfText+'</span><span>'+fmt(tv)+'</span><span>Δ '+gap+'</span></div>';}const roles=self.role01||[],roleSelf=roles.length?roles.join(' + '):'—';html+='<div class=\\"axis-compare-row\\"><b>0 / 1</b><span>'+roleSelf+'</span><span>0 '+Math.round(scores.role0)+'/100 · 1 '+Math.round(scores.role1)+'/100</span><span>—</span></div>';return html;}\n"""
s = one(s, "function roastV4(scores,result){", insert + "function roastV4(scores,result){", 'comparison function')

# Keep self-report out of questionnaire scores; store only questionnaire metadata there.
s = one(s, "scores._self_report={gender_label:state.selfGender,orientation_label:state.selfOrientation,role01:[...state.selfRole01]};", "", 'remove self report from scores')
s = one(s,
    "scores._item_manifest=QUESTIONS.map(q=>({id:q.id,reuse:q.reuse,key:q.key||null,type:q.type,origin:q.origin||null,attention:q.attention||null}));",
    "scores._item_manifest=QUESTIONS.map(q=>({id:q.id,reuse:q.reuse,fingerprint:ANSWER_COMPAT[q.reuse],key:q.key||null,type:q.type,attention:q.attention||null}));",
    'manifest fingerprints')
s = one(s,
    "scores._record={payload:'mf01sm-v4-record-1',version:VERSION,schema:SCHEMA,question_format:QUESTION_FORMAT,profile:{nickname:state.nickname,age:state.age,assignGender:state.assignGender,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfRole01:[...state.selfRole01]},history:{source_version:state.historySource,reused_ids:[...state.reusedIds]},timing:",
    "scores._record={payload:'mf01sm-v4-record-2',version:VERSION,schema:SCHEMA,question_format:QUESTION_FORMAT,answer_compat:ANSWER_COMPAT_FORMAT,profile:{nickname:state.nickname,age:state.age,assignGender:state.assignGender},history:{source_version:state.historySource,reused_ids:[...state.reusedIds]},timing:",
    'record v2')
s = one(s,
    "buildRadar(scores);$('#identityCards').replaceChildren",
    "buildRadar(scores);$('#selfCompare').innerHTML=buildSelfComparison(scores);$('#identityCards').replaceChildren",
    'render comparison')
s = one(s,
    "selfLikert:{role01:[...state.selfRole01]},location:state.location",
    "selfLikert:{_schema:SELF_STATS_SCHEMA,...structuredClone(state.selfLikert)},location:state.location",
    'save full independent self stats')
p.write_text(s)

# Regression updates.
p = Path('scripts/mf01sm-v4-regressions.mjs')
s = p.read_text()
s = one(s, "assert.equal(V4_VERSION, '4.0.1');", "assert.equal(V4_VERSION, '4.0.2');", 'regression version')
s = one(s,
    "assert.ok(MAIN_HTML.includes('0 / 1 自我感觉（可多选，但至少选一项）'));\nassert.ok(MAIN_HTML.includes(\"if(!selfRole01.length)return alert('0 / 1 自我感觉至少选一项；两项都可以选。')\"));",
    "assert.ok(MAIN_HTML.includes('光谱自我定位'));\nassert.ok(MAIN_HTML.includes('这一页不会参与测试计分。'));\nfor (const key of ['gender_expression','sexual_attraction_direction','sexual_attraction_intensity','sexual_expression','romantic_tendency','relationship_structure']) assert.ok(MAIN_HTML.includes('data-axis=\\\"'+key+'\\\"'),`self-report axis missing: ${key}`);\nassert.ok(MAIN_HTML.includes('0 / 1 自我感觉（可多选，但至少选一项）'));",
    'baseline regressions')
s = one(s,
    "assert.ok(MAIN_HTML.includes(\"a.reuse===q.reuse\"),'history reuse must require an unchanged reuse key');",
    "assert.ok(MAIN_HTML.includes(\"entry.answers?.[q.reuse]\"),'history reuse must use the stable reuse key');\nassert.ok(MAIN_HTML.includes(\"a.fp===ANSWER_COMPAT[q.reuse]\"),'history reuse must also require the item-definition fingerprint');\nassert.ok(MAIN_HTML.includes(\"HISTORY_FORMAT='mf01sm-v4-history-2'\") && MAIN_HTML.includes(\"ANSWER_COMPAT_FORMAT='mf01sm-v4-answers-1'\"));\nassert.ok(!MAIN_HTML.includes('mf01sm-v4-history-1'),'4.0/4.0.1 history is intentionally outside the compatibility baseline');",
    'history fingerprint regression')
s = one(s, "assert.ok(MAIN_HTML.includes(\"payload:'mf01sm-v4-record-1'\"));", "assert.ok(MAIN_HTML.includes(\"payload:'mf01sm-v4-record-2'\"));\nassert.ok(!MAIN_HTML.includes('scores._self_report='),'self-report statistics must remain independent from questionnaire scores');", 'record regression')
s = one(s,
    "fullScores._self_report={gender_label:'测试',orientation_label:'测试',role01:['0','1']};\n",
    "",
    'remove test self report score')
s = one(s,
    "fullScores._record={payload:'mf01sm-v4-record-1',version:V4_VERSION,schema:V4_SCHEMA,question_format:V4_QUESTION_FORMAT,profile:{nickname:'regression',age:16,assignGender:'AMAB',selfGender:'测试',selfOrientation:'测试',selfRole01:['0','1']},history:{source_version:'4.0.1',reused_ids:V4_QUESTIONS.map(q=>q.id)},",
    "fullScores._record={payload:'mf01sm-v4-record-2',version:V4_VERSION,schema:V4_SCHEMA,question_format:V4_QUESTION_FORMAT,answer_compat:'mf01sm-v4-answers-1',profile:{nickname:'regression',age:16,assignGender:'AMAB'},history:{source_version:'4.0.2',reused_ids:V4_QUESTIONS.map(q=>q.id)},",
    'test record v2')
old_save = "const save=await current.fetch(new Request('https://mf01sm.internal/api/save',{method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':'127.0.0.1'},body:JSON.stringify({version:V4_VERSION,nickname:'regression',age:16,gender:'AMAB',selfGender:'测试',selfOrientation:'测试',selfLikert:{role01:['0','1']},location:'Unavailable',tag:'test',scores:fullScores,timestamp:Date.now()})}),env);"
new_save = "const fullSelfStats={_schema:'mf01sm-v4-self-stats-1',gender_identity:0.82,gender_identity_special:null,gender_expression:0.76,sexual_attraction_direction:0.61,sexual_attraction_intensity:0.37,sexual_expression:0.22,romantic_tendency:0.89,relationship_structure:0.18,role01:['0','1']};\nconst save=await current.fetch(new Request('https://mf01sm.internal/api/save',{method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':'127.0.0.1'},body:JSON.stringify({version:V4_VERSION,nickname:'regression',age:16,gender:'AMAB',selfGender:'性别轴:0.820',selfOrientation:'性吸引方向:0.610',selfLikert:fullSelfStats,location:'Unavailable',tag:'test',scores:fullScores,timestamp:Date.now()})}),env);"
s = one(s, old_save, new_save, 'full self stats request')
s = one(s,
    "assert.equal(save.status,200);const saveJson=await save.json();assert.equal(saveJson.d1,true);assert.equal(saveJson.kv,false);assert.equal(kvWrites,0);assert.ok(inserted);const persisted=JSON.parse(inserted[11]);assert.deepEqual(persisted._answers,fullScores._answers,'raw answers must be persisted');assert.deepEqual(persisted._item_manifest,fullScores._item_manifest,'item manifest must be persisted');assert.equal(persisted._record.payload,'mf01sm-v4-record-1');",
    "assert.equal(save.status,200);const saveJson=await save.json();assert.equal(saveJson.d1,true);assert.equal(saveJson.kv,false);assert.equal(kvWrites,0);assert.ok(inserted);const persistedSelf=JSON.parse(inserted[6]);assert.deepEqual(persistedSelf,fullSelfStats,'independent self-report statistics must be persisted in self_likert');const persisted=JSON.parse(inserted[11]);assert.deepEqual(persisted._answers,fullScores._answers,'raw answers must be persisted separately in scores');assert.deepEqual(persisted._item_manifest,fullScores._item_manifest,'item manifest must be persisted');assert.equal(persisted._record.payload,'mf01sm-v4-record-2');",
    'D1 separation regression')
p.write_text(s)

# Deployment guardrails.
p = Path('scripts/deploy-mf01sm-runtime.mjs')
s = p.read_text()
s = one(s, "const VERSION = '4.0.1';", "const VERSION = '4.0.2';", 'deploy version')
s = one(s, "'4.0.1','mf01sm-v4-independent-leaf','mixed-v4-stable-reuse',", "'4.0.2','mf01sm-v4-independent-leaf','mixed-v4-stable-reuse',", 'deploy marker version')
s = one(s, "'scores too large','KV Legacy/Fallback'", "'scores too large','self stats too large','mf01sm-v4-self-stats-1','mf01sm-v4-history-2','mf01sm-v4-answers-1','KV Legacy/Fallback'", 'deploy new markers')
s = one(s, "const message = 'mf01sm v4.0.1 frontend copy cleanup';", "const message = 'mf01sm v4.0.2 independent self-report stats and stable v4 answer compatibility';", 'deploy message')
p.write_text(s)
