import v321Runtime from './v321-runtime.js';

const VERSION = '3.3.0';
const V33_SCHEMA = 'assigned-sex-v3.3-expanded-profile';
const V32_SCHEMA = 'assigned-sex-v3.2-expanded-profile';
const V31_SCHEMA = 'assigned-sex-v3.1-multidimensional';

const V32_SCORE_KEYS = [
  'gender_aligned','gender_cross','nonbinary','expression_masc','expression_fem',
  'rom_m','rom_f','rom_nb','phys_m','phys_f','phys_nb','libido','romantic_desire',
  'relationship_openness','initiative','autonomy'
];
const V33_SCORE_KEYS = [...V32_SCORE_KEYS, 'multi_partner'];

const V32_ANSWER_IDS = [
  'ga1','rm1','init1','gc1','rf1','aut1','nb1','pm1','ga2','pf1','gc2','check1',
  'rm2','nb2','rf2','init2','ga3','aut2','gc3','pm2','rf3','nb3','pf2','rm3',
  'pm3','init3','check2','ga4','pf3','aut3','gc4','nb4','init4','aut4',
  'em1','ef1','rn1','pn1','lib1','rd1','ro1','em2','ef2','rn2','pn2','lib2',
  'rd2','ro2','em3','ef3','rn3','pn3','lib3','rd3','ro3','lib4','rd4','ro4'
];
const V33_ANSWER_IDS = [...V32_ANSWER_IDS, 'mp1','mp2','mp3','mp4'];

const MULTI_PARTNER_QUESTIONS = [
  { id: 'mp1', key: 'multi_partner', pair: 'mp', text: '在所有相关者知情同意的前提下，我能想象自己同时维持不止一段恋爱关系。' },
  { id: 'mp2', key: 'multi_partner', text: '如果伴侣同时拥有另一段重要的恋爱关系，只要边界清楚且彼此同意，我不一定会觉得我们的关系因此失去价值。' },
  { id: 'mp3', key: 'multi_partner', text: '我能够接受一段关系网络里同时存在多个彼此重要的伴侣关系，而不要求所有关系都归并成一对一。' },
  { id: 'mp4', key: 'multi_partner', pair: 'mp', text: '相比只拥有一位恋爱伴侣，我对同时拥有多位知情同意的恋爱伴侣也有实际兴趣。' }
];

const SEXUAL_ORIENTATION_FIELD = String.raw`<div class="field orientation-self-field"><label>3. 你目前会用哪些性 / 身体吸引取向标签描述自己？</label><div class="note tiny">可以多选，也可以只选“不使用标签”。标签是自我描述，不由后面的量表分数替你决定。</div><div id="sexualOrientationTags" class="orientation-tags"><button class="choice orientation-tag" data-orientation-tag="异性恋" type="button">异性恋 <small>Straight</small></button><button class="choice orientation-tag" data-orientation-tag="同性恋" type="button">同性恋 <small>Gay / Lesbian</small></button><button class="choice orientation-tag" data-orientation-tag="双性恋" type="button">双性恋 <small>Bisexual</small></button><button class="choice orientation-tag" data-orientation-tag="泛性恋" type="button">泛性恋 <small>Pansexual</small></button><button class="choice orientation-tag" data-orientation-tag="无性恋" type="button">无性恋 <small>Asexual</small></button><button class="choice orientation-tag" data-orientation-tag="灰无性/半性" type="button">灰无性 / 半性 <small>Gray-ace / Demi</small></button><button class="choice orientation-tag" data-orientation-tag="酷儿" type="button">酷儿 <small>Queer</small></button><button class="choice orientation-tag" data-orientation-tag="探索中" type="button">探索中 <small>Questioning</small></button><button class="choice orientation-tag" data-orientation-tag="不使用标签" data-no-label="1" type="button">不使用标签</button></div><label for="sexualOrientationOther">其他自我描述 <span class="muted tiny">可选</span></label><input id="sexualOrientationOther" maxlength="28" autocomplete="off" placeholder="例如 sapphic / 自定义描述"><div data-field="selfOrientation" hidden><button id="sexualOrientationProxy" class="choice" data-value="" type="button" tabindex="-1" aria-hidden="true"></button></div></div>`;

const ROMANTIC_ORIENTATION_FIELD = String.raw`<div class="field orientation-self-field"><label>7. 你目前会用哪些浪漫取向标签描述自己？</label><div class="note tiny">浪漫取向和身体/性吸引可以不同，因此单独记录。</div><div id="romanticOrientationTags" class="orientation-tags"><button class="choice orientation-tag" data-romantic-tag="异性浪漫" type="button">异性浪漫</button><button class="choice orientation-tag" data-romantic-tag="同性浪漫" type="button">同性浪漫</button><button class="choice orientation-tag" data-romantic-tag="双性浪漫" type="button">双性浪漫 <small>Biromantic</small></button><button class="choice orientation-tag" data-romantic-tag="泛浪漫" type="button">泛浪漫 <small>Panromantic</small></button><button class="choice orientation-tag" data-romantic-tag="无浪漫" type="button">无浪漫 <small>Aromantic</small></button><button class="choice orientation-tag" data-romantic-tag="灰浪漫/半浪漫" type="button">灰浪漫 / 半浪漫</button><button class="choice orientation-tag" data-romantic-tag="酷儿" type="button">酷儿 <small>Queer</small></button><button class="choice orientation-tag" data-romantic-tag="探索中" type="button">探索中</button><button class="choice orientation-tag" data-romantic-tag="不使用标签" data-no-label="1" type="button">不使用标签</button></div><label for="romanticOrientationOther">其他自我描述 <span class="muted tiny">可选</span></label><input id="romanticOrientationOther" maxlength="28" autocomplete="off" placeholder="例如 homoromantic / 自定义描述"><div data-field="self_romantic_orientation" hidden><button id="romanticOrientationProxy" class="choice" data-value="" type="button" tabindex="-1" aria-hidden="true"></button></div></div>`;

const FIVE_CHOICES = '<button class="choice" data-value="1" type="button">无</button><button class="choice" data-value="2" type="button">低</button><button class="choice" data-value="3" type="button">中</button><button class="choice" data-value="4" type="button">高</button><button class="choice" data-value="5" type="button">很高</button>';

const TARGET_SELF_FIELDS = String.raw`
<div class="field target-self-field"><label>8. 你自己估计的浪漫吸引方向强度</label><div class="note tiny">这是你的直接自评。后面会把它与题目反应得到的三个浪漫吸引分数并排展示，而不是判断哪个“更真实”。</div><div class="target-row"><b>男性</b><div class="likert compact-likert" data-field="self_rom_m">${FIVE_CHOICES}</div></div><div class="target-row"><b>女性</b><div class="likert compact-likert" data-field="self_rom_f">${FIVE_CHOICES}</div></div><div class="target-row"><b>非二元 / 性别多元</b><div class="likert compact-likert" data-field="self_rom_nb">${FIVE_CHOICES}</div></div></div>
<div class="field target-self-field"><label>10. 你自己估计的身体 / 性吸引方向强度</label><div class="target-row"><b>男性</b><div class="likert compact-likert" data-field="self_phys_m">${FIVE_CHOICES}</div></div><div class="target-row"><b>女性</b><div class="likert compact-likert" data-field="self_phys_f">${FIVE_CHOICES}</div></div><div class="target-row"><b>非二元 / 性别多元</b><div class="likert compact-likert" data-field="self_phys_nb">${FIVE_CHOICES}</div></div></div>`;

const RELATIONSHIP_FIELDS = String.raw`<div class="field"><label>14. 对“协商一致的非排他关系”，你的个人接受 / 偏好程度如何？</label><div class="note tiny">这里的“开放”只表示双方或所有相关者知情同意后，允许关系保留某些外部亲密空间；它不等于多伴侣恋爱。</div><div class="likert" data-field="self_relationship_openness"><button class="choice" data-value="1" type="button">强烈偏好完全排他</button><button class="choice" data-value="2" type="button">较偏排他</button><button class="choice" data-value="3" type="button">都可以 / 看情况</button><button class="choice" data-value="4" type="button">较能接受开放</button><button class="choice" data-value="5" type="button">明显偏好开放</button></div></div><div class="field"><label>15. 对“同时存在多段知情同意的恋爱关系”，你的个人舒适 / 偏好程度如何？</label><div class="note tiny">这一项专门区分 poly / 多伴侣关系与一般开放关系；不推断你的实际关系数量。</div><div class="likert" data-field="self_multi_partner"><button class="choice" data-value="1" type="button">完全不向往</button><button class="choice" data-value="2" type="button">较不向往</button><button class="choice" data-value="3" type="button">中立 / 看情况</button><button class="choice" data-value="4" type="button">较能接受或向往</button><button class="choice" data-value="5" type="button">明显接受或向往</button></div></div>`;

const V33_CSS = String.raw`<style id="mf01sm-v33-selfid-ux">
.orientation-self-field{gap:11px}.orientation-tags{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:9px}.orientation-tag{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-height:54px!important}.orientation-tag small{font-size:.75rem;color:var(--muted);font-weight:600}.orientation-tag.active small{color:inherit;opacity:.82}.target-self-field{gap:12px}.target-row{display:grid;grid-template-columns:minmax(108px,.55fr) minmax(0,2fr);gap:10px;align-items:center}.target-row>b{font-size:.9rem}.compact-likert{grid-template-columns:repeat(5,minmax(0,1fr))!important}.compact-likert .choice{min-height:44px!important;padding:8px!important;text-align:center!important}.identity-compare{display:grid;gap:10px}.identity-compare>div{padding:12px 14px;border-radius:16px;background:var(--surface-3);overflow-wrap:anywhere}.comparison-subtitle{margin:12px 0 6px;font-weight:800}.relation-chip{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;background:var(--surface-3);font-size:.84rem;font-weight:700}@media(max-width:620px){.orientation-tags{grid-template-columns:1fr 1fr}.orientation-tag{display:block}.orientation-tag small{display:block;margin-top:2px}.target-row{grid-template-columns:1fr;gap:6px}.compact-likert{grid-template-columns:repeat(5,minmax(0,1fr))!important}.compact-likert .choice{padding:7px 3px!important;font-size:.86rem}}@media(max-width:390px){.orientation-tags{grid-template-columns:1fr}}
</style>`;

const V33_JS = String.raw`<script id="mf01sm-v33-selfid-js">(()=>{function setup(tagsId,attr,proxyId,inputId){const root=document.getElementById(tagsId),proxy=document.getElementById(proxyId),input=document.getElementById(inputId);if(!root||!proxy)return;const buttons=[...root.querySelectorAll('['+attr+']')],selected=new Set();const sync=()=>{const other=(input?.value||'').trim();const parts=[...selected];if(other)parts.push('其他:'+other.slice(0,28));proxy.dataset.value=parts.join('｜').slice(0,80);proxy.click();};buttons.forEach(btn=>btn.addEventListener('click',()=>{const value=btn.getAttribute(attr)||'',none=btn.dataset.noLabel==='1';if(none){selected.clear();buttons.forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false');});selected.add(value);}else{for(const x of buttons){if(x.dataset.noLabel==='1'){selected.delete(x.getAttribute(attr)||'');x.classList.remove('active');x.setAttribute('aria-pressed','false');}}if(selected.has(value))selected.delete(value);else selected.add(value);}for(const x of buttons){const active=selected.has(x.getAttribute(attr)||'');x.classList.toggle('active',active);x.setAttribute('aria-pressed',active?'true':'false');}sync();}));input?.addEventListener('input',()=>{for(const x of buttons){if(x.dataset.noLabel==='1'){selected.delete(x.getAttribute(attr)||'');x.classList.remove('active');x.setAttribute('aria-pressed','false');}}sync();});}setup('sexualOrientationTags','data-orientation-tag','sexualOrientationProxy','sexualOrientationOther');setup('romanticOrientationTags','data-romantic-tag','romanticOrientationProxy','romanticOrientationOther');const posMap={'男性':0,'偏男性':17,'男性-非二元之间':33,'非二元':50,'非二元-女性之间':67,'偏女性':83,'女性':100,'轴外/不适用':'NA'};document.querySelectorAll('[data-gender-position]').forEach(btn=>btn.addEventListener('click',()=>{state.selfLikert.self_gender_position=posMap[btn.dataset.genderPosition]??'NA';}));})();</script>`;

const FINISH_V33 = String.raw`async function finish(){
const quality=responseQuality();
const scores={gender_aligned:scoreAxis('gender_aligned'),gender_cross:scoreAxis('gender_cross'),nonbinary:scoreAxis('nonbinary'),expression_masc:scoreAxis('expression_masc'),expression_fem:scoreAxis('expression_fem'),rom_m:scoreAxis('rom_m'),rom_f:scoreAxis('rom_f'),rom_nb:scoreAxis('rom_nb'),phys_m:scoreAxis('phys_m'),phys_f:scoreAxis('phys_f'),phys_nb:scoreAxis('phys_nb'),libido:scoreAxis('libido'),romantic_desire:scoreAxis('romantic_desire'),relationship_openness:scoreAxis('relationship_openness'),multi_partner:scoreAxis('multi_partner'),initiative:scoreAxis('initiative'),autonomy:scoreAxis('autonomy')};
scores.expression_position=Math.round(clamp(50+(scores.expression_fem-scores.expression_masc)/2));scores.expression_balance=Math.round(clamp(100-Math.abs(scores.expression_fem-scores.expression_masc)));scores.phys_overall=Math.max(scores.phys_m,scores.phys_f,scores.phys_nb);scores.rom_overall=Math.max(scores.rom_m,scores.rom_f,scores.rom_nb);scores.m=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;scores.f=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;scores.attr_m=Math.round((scores.rom_m+scores.phys_m)/2);scores.attr_f=Math.round((scores.rom_f+scores.phys_f)/2);scores.agender=scores.nonbinary;scores.ace=Math.round(clamp(100-scores.phys_overall));scores.top=scores.initiative;scores.bot=100-scores.initiative;scores.d=scores.autonomy;scores.s=100-scores.autonomy;scores.trans=Math.round(clamp(50+(scores.gender_cross-scores.gender_aligned)*.6));scores.pan=Math.round(clamp(Math.min(scores.attr_m,scores.attr_f)));scores.validity=quality.score;scores.response_quality=quality.score;scores.response_quality_detail=quality;scores.duration_ms=Date.now()-state.startedAt;
const map5=v=>{const n=Number(v);return n>=1&&n<=5?Math.round((n-1)/4*100):null;};const map7=v=>{const n=Number(v);return n>=1&&n<=7?Math.round((n-1)/6*100):null;};const cmp=(self,test)=>self===null?null:{self,test,gap:Math.abs(self-test),signed_gap:test-self};scores.self_test_comparison={gender_expression:cmp(map7(state.selfLikert.self_gender_expression),scores.expression_position),sexual_attraction_intensity:cmp(map5(state.selfLikert.self_phys_intensity),scores.phys_overall),libido:cmp(map5(state.selfLikert.self_libido),scores.libido),romantic_desire:cmp(map5(state.selfLikert.self_romantic_desire),scores.romantic_desire),relationship_openness:cmp(map5(state.selfLikert.self_relationship_openness),scores.relationship_openness),multi_partner:cmp(map5(state.selfLikert.self_multi_partner),scores.multi_partner),rom_m:cmp(map5(state.selfLikert.self_rom_m),scores.rom_m),rom_f:cmp(map5(state.selfLikert.self_rom_f),scores.rom_f),rom_nb:cmp(map5(state.selfLikert.self_rom_nb),scores.rom_nb),phys_m:cmp(map5(state.selfLikert.self_phys_m),scores.phys_m),phys_f:cmp(map5(state.selfLikert.self_phys_f),scores.phys_f),phys_nb:cmp(map5(state.selfLikert.self_phys_nb),scores.phys_nb)};const validCmp=Object.values(scores.self_test_comparison).filter(x=>x&&typeof x==='object'&&Number.isFinite(x.gap));scores.self_test_comparison.mean_absolute_gap=validCmp.length?Math.round(validCmp.reduce((a,x)=>a+x.gap,0)/validCmp.length):null;
scores._schema='assigned-sex-v3.3-expanded-profile';scores._scoring='unweighted-subscale-means';scores._legacy_composites=['m','f','attr_m','attr_f','agender','ace','top','bot','d','s','trans','pan','validity'];scores._answers=Object.fromEntries(QUESTIONS.map((q,i)=>[q.id,state.answers[i]]));scores._self_report={...state.selfLikert};
const oldResult=buildResult(scores,quality),gp=genderProfile(scores);const gpLabel=gp==='CROSS'?'跨指派性别方向较强':gp==='ALIGNED'?'指派性别一致方向较强':gp==='NONBINARY'?'非二元适配方向较强':gp==='BOTH'?'两种二元方向都较强':'性别方向较混合';const targetSummary=kind=>{const list=[['男',scores[kind+'_m']],['女',scores[kind+'_f']],['非二元/性别多元',scores[kind+'_nb']]];const max=Math.max(...list.map(x=>x[1]));if(max<38)return'整体较低';const near=list.filter(x=>x[1]>=56&&max-x[1]<=16).map(x=>x[0]);return near.length?near.join('/')+'较明显':list.sort((a,b)=>b[1]-a[1])[0][0]+'略高';};const romSummary=targetSummary('rom'),physSummary=targetSummary('phys');const relationProfile=scores.multi_partner>=62?(scores.relationship_openness>=56?'多伴侣关系兼容度较高':'多伴侣兴趣较高，但一般开放度并不高'):scores.relationship_openness>=62?'协商开放度较高，但多伴侣恋爱偏好不突出':(scores.relationship_openness<=38&&scores.multi_partner<=38?'一对一排他偏好较明显':'关系结构偏好较灵活 / 混合');scores.relationship_profile=relationProfile;scores.self_identity_comparison={gender:{self:state.selfGender,test_profile:gpLabel},sexual_orientation:{self:state.selfOrientation,test_scores:{male:scores.phys_m,female:scores.phys_f,nonbinary:scores.phys_nb}},romantic_orientation:{self:state.selfLikert.self_romantic_orientation||'',test_scores:{male:scores.rom_m,female:scores.rom_f,nonbinary:scores.rom_nb}}};
$('#resultTitle').textContent=gpLabel+' · 浪漫 '+romSummary+' · 身体 '+physSummary;const attractionBody='浪漫吸引：男 '+scores.rom_m+'、女 '+scores.rom_f+'、非二元/性别多元 '+scores.rom_nb+'；身体/性吸引：男 '+scores.phys_m+'、女 '+scores.phys_f+'、非二元/性别多元 '+scores.phys_nb+'。';const exprDiff=scores.expression_fem-scores.expression_masc;const exprText=Math.abs(exprDiff)<=12?(scores.expression_masc<38&&scores.expression_fem<38?'性别表达整体没有明显男性化或女性化倾向。':'男性化与女性化表达得分接近，可能更中性、雌雄同体或随情境变化。'):(exprDiff>0?'性别表达整体更偏女性化。':'性别表达整体更偏男性化。');const level=v=>v>=62?'较强':v<=38?'较低':'中等';const desireBody='性欲/性冲动 '+scores.libido+'（'+level(scores.libido)+'）；对恋爱关系本身的向往 '+scores.romantic_desire+'（'+level(scores.romantic_desire)+'）；关系开放度 '+scores.relationship_openness+'，多伴侣关系舒适度 '+scores.multi_partner+'。'+relationProfile+'。';const labels={gender_expression:'性别表达位置',sexual_attraction_intensity:'身体/性吸引总体强度',libido:'性欲/性冲动',romantic_desire:'恋爱关系向往',relationship_openness:'关系开放度',multi_partner:'多伴侣关系舒适度',rom_m:'浪漫·男性',rom_f:'浪漫·女性',rom_nb:'浪漫·非二元',phys_m:'身体·男性',phys_f:'身体·女性',phys_nb:'身体·非二元'};const escHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const rowFor=(k,v)=>'<div class="comparison-row"><b>'+labels[k]+'</b><span>'+v.self+'</span><span>'+v.test+'</span><span>Δ '+v.gap+'</span></div>';let generalRows='',directionRows='';for(const [k,v] of Object.entries(scores.self_test_comparison)){if(k==='mean_absolute_gap'||!v||typeof v!=='object')continue;(k.startsWith('rom_')||k.startsWith('phys_')?directionRows:generalRows)+=rowFor(k,v);}const compareBlock='<div class="comparison"><div class="comparison-row comparison-head"><b>维度</b><span>自评</span><span>量表</span><span>差值</span></div>'+generalRows+'<div class="comparison-subtitle">吸引方向自评 ↔ 量表</div>'+directionRows+'</div>';const qualityClass=quality.score>=80?'good':quality.score>=60?'mid':'low';
$('#analysis').innerHTML='<div class="result-block"><b>性别方向</b><p>'+oldResult.genderBody+'</p></div><div class="result-block"><b>性别表达</b><p>'+exprText+' 男性化 '+scores.expression_masc+'，女性化 '+scores.expression_fem+'，合成位置 '+scores.expression_position+'/100。</p></div><div class="result-block"><b>吸引对象与强度</b><p>'+attractionBody+'</p></div><div class="result-block"><b>欲望与关系结构</b><p>'+desireBody+'</p><span class="relation-chip">'+relationProfile+'</span></div><div class="result-block"><b>自我认同 / 标签 ↔ 量表画像</b><div class="identity-compare"><div><b>性别</b><br>自报：'+escHtml(state.selfGender)+'<br>量表：'+escHtml(gpLabel)+'</div><div><b>身体/性取向</b><br>自报标签：'+escHtml(state.selfOrientation)+'<br>量表方向：男 '+scores.phys_m+' / 女 '+scores.phys_f+' / 非二元 '+scores.phys_nb+'</div><div><b>浪漫取向</b><br>自报标签：'+escHtml(state.selfLikert.self_romantic_orientation||'未提供')+'<br>量表方向：男 '+scores.rom_m+' / 女 '+scores.rom_f+' / 非二元 '+scores.rom_nb+'</div></div><p class="muted tiny">标签与连续分数不是一一对应关系，这里只并排展示，不自动判断“匹配 / 不匹配”。</p></div><div class="result-block"><b>连续自评 ↔ 量表</b><p>差值只用于研究自我定位与题目反应的关系，不是诚实度、正确率或效度判定。'+(scores.self_test_comparison.mean_absolute_gap===null?'':' 当前可比维度平均绝对差值 '+scores.self_test_comparison.mean_absolute_gap+'。')+'</p>'+compareBlock+'</div><div class="result-block"><b>关系互动</b><p>'+oldResult.relationBody+'</p></div><div class="result-block"><b>作答质量提示</b><p class="quality '+qualityClass+'">'+quality.score+'/100（'+oldResult.qualityLabel+'）。注意力检查 '+quality.attention_passed+'/'+quality.attention_total+'，语义平行题一致度 '+quality.pair_score+'/100。'+(quality.score<60?'本次结果建议只作低置信度参考。':'该分数用于识别明显的随意作答，不是心理学“效度分”。')+'</p></div>';
const bars=[['指派性别一致',scores.gender_aligned],['跨指派性别',scores.gender_cross],['非二元适配',scores.nonbinary],['表达·男性化',scores.expression_masc],['表达·女性化',scores.expression_fem],['男性浪漫吸引',scores.rom_m],['女性浪漫吸引',scores.rom_f],['非二元浪漫吸引',scores.rom_nb],['男性身体/性吸引',scores.phys_m],['女性身体/性吸引',scores.phys_f],['非二元身体/性吸引',scores.phys_nb],['性欲/性冲动',scores.libido],['恋爱关系向往',scores.romantic_desire],['关系开放度',scores.relationship_openness],['多伴侣关系舒适度',scores.multi_partner],['主动推进',scores.initiative],['自主掌控',scores.autonomy]];$('#bars').replaceChildren();bars.forEach(pair=>{const row=document.createElement('div');row.className='barrow';row.innerHTML='<span>'+pair[0]+'</span><span class="bartrack"><span style="width:'+pair[1]+'%"></span></span><b>'+pair[1]+'</b>';$('#bars').appendChild(row);});show('result');try{await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:VERSION,nickname:state.nickname,age:state.age,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfLikert:state.selfLikert,location:state.location,gender:state.assignGender,tag:$('#resultTitle').textContent,scores,timestamp:Date.now()})});}catch(e){console.error('Archive Failed',e);}}
`;

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

function validAnswers(scores, ids) {
  const answers = parseObject(scores._answers);
  return ids.every(id => Number.isInteger(answers[id]) && answers[id] >= 1 && answers[id] <= 5);
}

function validV32Scores(scores) {
  if (scores._schema !== V32_SCHEMA || scores._scoring !== 'unweighted-subscale-means') return false;
  if (!V32_SCORE_KEYS.every(key => validScore(scores[key])) || !validAnswers(scores, V32_ANSWER_IDS)) return false;
  const quality = parseObject(scores.response_quality_detail);
  return quality.attention_total === 2 && validScore(scores.response_quality);
}

function validV321Scores(scores) {
  if (!validV32Scores(scores)) return false;
  const thresholds = parseObject(parseObject(scores.response_quality_detail).run_thresholds);
  return thresholds.mild === 16 && thresholds.mid === 21 && thresholds.severe === 28;
}

function validV33Scores(scores) {
  if (scores._schema !== V33_SCHEMA || scores._scoring !== 'unweighted-subscale-means') return false;
  if (!V33_SCORE_KEYS.every(key => validScore(scores[key])) || !validAnswers(scores, V33_ANSWER_IDS)) return false;
  const quality = parseObject(scores.response_quality_detail);
  const thresholds = parseObject(quality.run_thresholds);
  if (quality.attention_total !== 2 || !validScore(scores.response_quality) || thresholds.mild !== 17 || thresholds.mid !== 23 || thresholds.severe !== 30) return false;
  const self = parseObject(scores._self_report);
  const requiredSelf = ['self_romantic_orientation','self_rom_m','self_rom_f','self_rom_nb','self_phys_m','self_phys_f','self_phys_nb','self_phys_intensity','self_libido','self_romantic_desire','self_relationship_openness','self_multi_partner'];
  return requiredSelf.every(key => typeof self[key] === 'string' && self[key].length > 0);
}

function resolveRecordVersion(declaredVersion, scores) {
  if (declaredVersion === VERSION) return validV33Scores(scores) ? VERSION : '';
  if (declaredVersion === '3.2.1') return validV321Scores(scores) ? '3.2.1' : '';
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
  try { data = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);
  const nickname = text(data.nickname, 80);
  const age = Number(data.age);
  const assignGender = data.gender === 'AMAB' || data.gender === 'AFAB' ? data.gender : '';
  if (!nickname || !Number.isInteger(age) || age < 13 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const scores = parseObject(data.scores);
  const recordVersion = resolveRecordVersion(text(data.version, 24), scores);
  if (!recordVersion) return json({ error: 'questionnaire schema/version mismatch' }, 400);
  if (recordVersion === VERSION && (!text(data.selfGender, 80) || !text(data.selfOrientation, 80))) return json({ error: 'self-report metadata incomplete' }, 400);
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
      .bind(id, recordVersion, nickname, age, text(data.selfGender, 80), text(data.selfOrientation, 80), JSON.stringify(selfLikert), location, ip, assignGender, text(data.tag, 240), scoreJson, timestamp).run();
    return json({ success: true, d1: true, kv: false, version: recordVersion });
  } catch (error) {
    console.error('mf01sm.v33-d1-save', error);
  }
  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version: recordVersion, nickname, age, gender: assignGender, location, ip, d1_synced: false, timestamp }));
    return json({ success: true, d1: false, kv: true, version: recordVersion });
  } catch (error) {
    console.error('mf01sm.v33-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

function patchQuestions(html) {
  const start = html.indexOf('const QUESTIONS=');
  const end = start >= 0 ? html.indexOf(';const LABELS=', start) : -1;
  if (start < 0 || end <= start) return html;
  try {
    const questions = JSON.parse(html.slice(start + 'const QUESTIONS='.length, end));
    if (questions.some(question => question.id === 'mp1')) return html;
    const revised = questions.map(question => {
      if (question.id === 'ro2') return { ...question, text: '如果所有相关者都知情同意、边界清楚，我能接受伴侣彼此保留与他人发展亲密关系的空间。' };
      if (question.id === 'ro3') return { ...question, text: '长期关系中的承诺，对我来说不一定要求完全排除经协商允许的外部亲密联系。' };
      return question;
    });
    const out = [];
    let extraIndex = 0;
    for (let i = 0; i < revised.length; i++) {
      out.push(revised[i]);
      const target = Math.floor(((i + 1) * MULTI_PARTNER_QUESTIONS.length) / revised.length);
      while (extraIndex < target) out.push(MULTI_PARTNER_QUESTIONS[extraIndex++]);
    }
    while (extraIndex < MULTI_PARTNER_QUESTIONS.length) out.push(MULTI_PARTNER_QUESTIONS[extraIndex++]);
    return html.slice(0, start) + `const QUESTIONS=${JSON.stringify(out)}` + html.slice(end);
  } catch (error) {
    console.error('mf01sm.v33-question-patch', error);
    return html;
  }
}

function patchMain(html) {
  html = html.replaceAll('3.2.1', VERSION).replace('<title>认知与取向测试 · v3.2</title>', '<title>认知与取向测试 · v3.3</title>').replace('0–100 是 v3.2 内部等权子量表分数', '0–100 是 v3.3 内部等权子量表分数');
  html = html.replace(/<div class="field"><label>3\. 你目前最常使用的性 \/ 身体吸引取向身份描述是？<\/label><div class="grid" data-field="selfOrientation">[\s\S]*?<\/div><\/div>(?=<div class="field"><label>4\.)/, SEXUAL_ORIENTATION_FIELD);
  html = html.replace(/<div class="field"><label>7\. 你目前最常使用的浪漫取向身份描述是？<\/label><div class="grid" data-field="self_romantic_orientation">[\s\S]*?<\/div><\/div>(?=<div class="field"><label>8\.)/, ROMANTIC_ORIENTATION_FIELD);
  html = html.replace('<div class="field"><label>8. 你的日常性别表达更接近哪里？</label>', `${TARGET_SELF_FIELDS}<div class="field"><label>9. 你的日常性别表达更接近哪里？</label>`);
  html = html.replace('9. 你自觉整体的身体/性吸引强度如何？', '11. 你自觉整体的身体/性吸引强度如何？').replace('10. 不考虑具体对象时，你自觉自己的性欲 / 性冲动强度如何？', '12. 不考虑具体对象时，你自觉自己的性欲 / 性冲动强度如何？').replace('11. 你对“拥有恋爱关系本身”的向往有多强？', '13. 你对“拥有恋爱关系本身”的向往有多强？');
  html = html.replace(/<div class="field"><label>12\. 如果只看个人偏好，你更喜欢怎样的关系结构？<\/label>[\s\S]*?<\/div>(?=<div class="actions"><button id="baselineNext")/, RELATIONSHIP_FIELDS);
  html = html.replace("const required=['self_romantic_orientation','self_gender_expression','self_phys_intensity','self_libido','self_romantic_desire','self_relationship_pref'];", "const required=['self_romantic_orientation','self_rom_m','self_rom_f','self_rom_nb','self_gender_expression','self_phys_m','self_phys_f','self_phys_nb','self_phys_intensity','self_libido','self_romantic_desire','self_relationship_openness','self_multi_partner'];");
  html = patchQuestions(html);
  const finishStart = html.indexOf('async function finish(){');
  const finishEnd = finishStart >= 0 ? html.indexOf('</script>', finishStart) : -1;
  if (finishStart >= 0 && finishEnd > finishStart) html = html.slice(0, finishStart) + FINISH_V33 + html.slice(finishEnd);
  html = html.replace('</head>', `${V33_CSS}</head>`).replace('</body>', `${V33_JS}</body>`);
  return html;
}

function patchAdmin(html) {
  const marker = "let scoreText;if(String(item.version||'').startsWith('3.2')){";
  const replacement = "let scoreText;if(String(item.version||'').startsWith('3.3')){scoreText='一致:'+Math.round(sc.gender_aligned||0)+' 跨:'+Math.round(sc.gender_cross||0)+' NB:'+Math.round(sc.nonbinary||0)+' | 表M:'+Math.round(sc.expression_masc||0)+' 表F:'+Math.round(sc.expression_fem||0)+' | 浪M:'+Math.round(sc.rom_m||0)+' 浪F:'+Math.round(sc.rom_f||0)+' 浪NB:'+Math.round(sc.rom_nb||0)+' | 身M:'+Math.round(sc.phys_m||0)+' 身F:'+Math.round(sc.phys_f||0)+' 身NB:'+Math.round(sc.phys_nb||0)+' | 欲:'+Math.round(sc.libido||0)+' 恋:'+Math.round(sc.romantic_desire||0)+' 开:'+Math.round(sc.relationship_openness||0)+' 多:'+Math.round(sc.multi_partner||0)+' | 主动:'+Math.round(sc.initiative||0)+' 自主:'+Math.round(sc.autonomy||0)+' | 质量:'+Math.round(sc.response_quality||0)+' 注:'+Math.round((sc.response_quality_detail||{}).attention_passed||0)+'/'+Math.round((sc.response_quality_detail||{}).attention_total||0)+' 平行:'+Math.round((sc.response_quality_detail||{}).pair_score||0)+' 速:'+Math.round((sc.response_quality_detail||{}).ms_per_item||0)+'ms/题';}else if(String(item.version||'').startsWith('3.2')){";
  return html.replace(marker, replacement).replace('历史版本继续原样保留。v3.1 起把浪漫吸引与身体/性吸引分开；Ver 列直接来自每条记录的 version。', '历史版本继续原样保留。v3.1 起把浪漫吸引与身体/性吸引分开；v3.3 将关系开放度与多伴侣关系舒适度拆分。Ver 列直接来自每条记录的 version。');
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/api/save') return saveRecord(request, env);
  const response = await v321Runtime.fetch(request, env, ctx);
  if (request.method !== 'GET') return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html') || (url.pathname !== '/' && url.pathname !== '/admin')) return response;
  const original = await response.text();
  const body = url.pathname === '/admin' ? patchAdmin(original) : patchMain(original);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default { fetch(request, env, ctx) { return route(request, env, ctx); } };
