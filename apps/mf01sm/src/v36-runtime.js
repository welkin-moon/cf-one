import v35Runtime from './v35-runtime.js';

const VERSION = '3.6.0';
const V36_SCHEMA = 'assigned-sex-v3.6-balanced-personality';
const QUESTION_FORMAT = 'mixed-v36-balanced';

const SCORE_KEYS = [
  'gender_aligned','gender_cross','nonbinary','gender_style_masc','gender_style_fem',
  'rom_m','rom_f','rom_nb','phys_m','phys_f','phys_nb','libido','romantic_desire',
  'relationship_openness','initiative','dominance','autonomy'
];
const ANSWER_IDS = [
  'ga1','ms1','init1','gc1','fs1','aut1','nb1','dom1','rm1','rf1','rn1','check1',
  'ms2','fs2','ga2','init2','pm1','pf1','pn1','dom2','nb2','aut2','lib1','rd1',
  'ms3','fs3','gc2','init3','ro1','dom3','ga3','fs4','ms4','aut3','check2','nb3',
  'gc3','ms5','fs5','init4','lib2','rd2','dom4','aut4','ms6','fs6','ro2','init5',
  'dom5','aut5','ms7','fs7'
];
const BASELINE_AXES = [
  'gender_identity','gender_expression','sexual_attraction_direction','sexual_attraction_intensity',
  'libido','romantic_tendency','relationship_structure'
];
const RESULT_AXES = [...BASELINE_AXES, 'initiative01', 'dominance', 'autonomy'];
const GENDER_SPECIAL = new Set(['agender','bigender','genderfluid']);

// v3.6 deliberately shifts the center of gravity away from sexuality. 50 substantive items:
// 9 gender-direction, 14 nonsexual gender-coded style, 12 attraction/romance/relationship,
// 15 interpersonal initiative/dominance/autonomy, plus 2 response-quality checks.
const QUESTIONS_V36 = [
  {id:'ga1',key:'gender_aligned',pair:'ga',type:'vibe',text:'别人自然按你的出生指派性别来理解你时，这种“默认设定”通常有多贴合？'},
  {id:'ms1',key:'gender_style_masc',pair:'ms',type:'intensity',text:'玩有输赢的游戏时，“我想赢”这股劲通常有多明显？'},
  {id:'init1',key:'initiative',pair:'init',type:'cards',text:'一群人都说“随便”，计划卡住了。你更可能怎么做？',options:['继续等别人开头','偶尔补一句意见','一起慢慢磨','先列出几个可选方案','直接把时间地点往前推进']},
  {id:'gc1',key:'gender_cross',pair:'gc',type:'vibe',text:'别人自然把你理解成与出生指派性别不同的一侧时，这种感觉通常有多贴合？'},
  {id:'fs1',key:'gender_style_fem',pair:'fs',type:'intensity',text:'你有多容易察觉别人语气、表情或聊天节奏里很细小的情绪变化？'},
  {id:'aut1',key:'autonomy',pair:'aut',type:'slider',text:'一件事主要影响你本人时，你希望最终决定权放在哪里？',anchors:['交给可信的人也可以','充分商量','我保留最后决定权']},
  {id:'nb1',key:'nonbinary',pair:'nb',type:'comfort',text:'一个角色创建器不要求你只能从“男 / 女”二选一，而是允许更自由地组合性别设定。这会让你多自在？'},
  {id:'dom1',key:'dominance',pair:'dom',type:'cards',text:'小组合作刚开始，大家都没有明确分工。你通常更舒服的位置是？',options:['先听别人安排','有人带着我做最好','一起商量着来','我会主动分配一部分任务','我很自然会定节奏和分工']},
  {id:'rm1',key:'rom_m',type:'likelihood',text:'一位很符合你偏好的男性对你表现出明显的特别关注时，你产生恋爱心动的可能性？'},
  {id:'rf1',key:'rom_f',type:'likelihood',text:'一位很符合你偏好的女性对你表现出明显的特别关注时，你产生恋爱心动的可能性？'},
  {id:'rn1',key:'rom_nb',type:'likelihood',text:'一位很符合你偏好的非二元 / 性别多元的人对你表现出明显的特别关注时，你产生恋爱心动的可能性？'},
  {id:'check1',attention:4,type:'cards',text:'🦆 鸭长官路过：这一题只检查你有没有读题，请选择第四项。',options:['第一项','第二项','第三项','收到，第四项 🫡','第五项']},

  {id:'ms2',key:'gender_style_masc',type:'cards',text:'桌上有个坏掉的小设备，而旁边也有现成替代品。你第一反应更像？',options:['直接用替代品，不想研究','大概看看就算了','看时间和心情','会想找出哪里坏了','很想拆开、定位问题、把它修明白']},
  {id:'fs2',key:'gender_style_fem',type:'cards',text:'给朋友准备一个小礼物时，你会不会顺手考虑包装、配色、卡片或一点小仪式感？',options:['完全不会','通常不太会','看情况','经常会','这些细节本身就很好玩']},
  {id:'ga2',key:'gender_aligned',type:'slider',text:'如果身体的性别特征可以安全自由调整，你有多想让它们保留或靠近出生指派性别方向？',anchors:['完全不想','看情况','很想']},
  {id:'init2',key:'initiative',type:'likelihood',text:'聊天冷下来，但你其实还想继续。你会主动扔一个新话题把它救回来吗？'},
  {id:'pm1',key:'phys_m',type:'intensity',text:'遇到很符合你偏好的男性时，身体层面的吸引感通常有多明显？'},
  {id:'pf1',key:'phys_f',type:'intensity',text:'遇到很符合你偏好的女性时，身体层面的吸引感通常有多明显？'},
  {id:'pn1',key:'phys_nb',type:'intensity',text:'遇到很符合你偏好的非二元 / 性别多元的人时，身体层面的吸引感通常有多明显？'},
  {id:'dom2',key:'dominance',type:'comfort',text:'有人已经准备好一个清楚可行的方案，并说“你跟着我来就好”。你对这种被带着走的模式有多舒服？',reverse:true},
  {id:'nb2',key:'nonbinary',type:'vibe',text:'“我的性别体验未必需要长期固定在男或女的一端。”这句话有多像你的实际体验？'},
  {id:'aut2',key:'autonomy',type:'comfort',text:'可信的人替你把一件主要影响你自己的重要事情直接决定好，你会有多舒服？',reverse:true},
  {id:'lib1',key:'libido',pair:'lib',type:'frequency',text:'不考虑具体对象时，性方面的欲望或冲动自己出现的频率大概是？'},
  {id:'rd1',key:'romantic_desire',pair:'rd',type:'desire',text:'即使现在没有特定喜欢的人，你对“拥有一段恋爱关系”本身有多向往？'},

  {id:'ms3',key:'gender_style_masc',type:'cards',text:'遇到一个棘手问题时，你最自然的处理顺序更像？',options:['先找人聊感受再说','先缓一缓','边感受边处理','先列问题和方案','先把能解决的部分直接干掉']},
  {id:'fs3',key:'gender_style_fem',type:'cards',text:'进入一个新房间时，你会多快注意到光线、颜色、材质和整体氛围是不是协调？',options:['基本不会注意','过很久才会','偶尔会','很快会注意','几乎第一眼就在看这些']},
  {id:'gc2',key:'gender_cross',type:'slider',text:'如果身体性别特征可以安全自由调整，你有多想让其中一些朝出生指派性别不同的一侧发展？',anchors:['完全不想','看情况','很想']},
  {id:'init3',key:'initiative',type:'cards',text:'两个人对一件事有点僵住，但你希望关系继续。你通常会？',options:['等对方先开口','给对方时间','看谁先忍不住','我会试着先开启沟通','我会明确提出下一步怎么谈']},
  {id:'ro1',key:'relationship_openness',pair:'ro',type:'comfort',text:'如果所有相关者都知情同意、边界清楚，你对“长期关系可以不是绝对排他”这个想法有多舒服？'},
  {id:'dom3',key:'dominance',type:'slider',text:'合作时，你更喜欢谁来掌握节奏？',anchors:['别人定节奏我跟上','轮流 / 协商','我来定节奏更舒服']},
  {id:'ga3',key:'gender_aligned',pair:'ga',type:'vibe',text:'想象十年后的自己，继续长期以出生指派性别生活，这幅画面对你有多自然？'},
  {id:'fs4',key:'gender_style_fem',type:'frequency',text:'看到朋友明显疲惫或情绪低落时，你会自然去照顾气氛、问一句、递点东西或想办法让对方舒服一点吗？'},
  {id:'ms4',key:'gender_style_masc',type:'intensity',text:'面对一点风险和不确定性时，只要收益值得，你有多愿意“先试了再说”？'},
  {id:'aut3',key:'autonomy',type:'cards',text:'朋友很懂你，也真心为你好，但建议与你自己的选择不同。你更可能？',options:['直接按朋友说的做','大多听朋友的','重新一起权衡','会听意见但自己决定','除非有新事实，否则坚持自己的决定']},
  {id:'check2',attention:2,type:'cards',text:'🐈 猫猫检查员说：请点第二项，它就放你继续。',options:['第一项','喵，第二项','第三项','第四项','第五项']},
  {id:'nb3',key:'nonbinary',pair:'nb',type:'comfort',text:'别人不急着把你固定进单一“男性 / 女性”格子，而是允许你自己慢慢定义，这会让你多放松？'},

  {id:'gc3',key:'gender_cross',pair:'gc',type:'vibe',text:'想象十年后的自己，以与出生指派性别不同的一侧生活，这幅画面对你有多自然？'},
  {id:'ms5',key:'gender_style_masc',type:'cards',text:'选日常用品时，你的优先级更像？',options:['外观和细节明显比功能重要','会更看外观','差不多','会更看功能和耐用','功能、效率、耐用压倒一切']},
  {id:'fs5',key:'gender_style_fem',type:'intensity',text:'表达喜欢、感谢、想念或温柔时，你有多愿意把这种情绪直接表现出来？'},
  {id:'init4',key:'initiative',type:'cards',text:'一个你很想参加的小活动没人组织。你更可能？',options:['等别人组织','问问有没有人想组织','口头说说想法','主动拉个小群开始定','自己先把框架搭起来再叫人']},
  {id:'lib2',key:'libido',pair:'lib',type:'slider',text:'如果给自己的“性欲旋钮”随手拧一个位置，它平时更靠哪边？',anchors:['几乎静音','中间档','存在感很强']},
  {id:'rd2',key:'romantic_desire',pair:'rd',type:'slider',text:'如果给自己的“恋爱关系向往旋钮”拧一个位置，它通常更靠哪边？',anchors:['几乎没有','随缘','非常向往']},
  {id:'dom4',key:'dominance',type:'cards',text:'多人游戏或团队任务里，你最舒服的角色更像？',options:['执行别人给的明确任务','有人指挥会很省心','哪里缺人补哪里','会主动协调其他人','很享受当指挥 / 队长']},
  {id:'aut4',key:'autonomy',type:'intensity',text:'即使关系非常亲近，“我的边界和重大选择最终仍由我自己确认”这件事对你有多重要？'},
  {id:'ms6',key:'gender_style_masc',type:'frequency',text:'遇到体力、速度、竞技或高难度挑战时，你会因为“想看看自己能不能搞定”而被吸引吗？'},
  {id:'fs6',key:'gender_style_fem',type:'cards',text:'纪念日、合照、票根、小纸条之类有情绪记忆的东西，你通常怎么对待？',options:['基本不留','偶尔顺手留','看东西本身','会特意留一些','很喜欢保存这些有故事的小东西']},
  {id:'ro2',key:'relationship_openness',pair:'ro',type:'likelihood',text:'边界透明、所有人都同意的前提下，你实际考虑非排他关系安排的可能性？'},
  {id:'init5',key:'initiative',pair:'init',type:'likelihood',text:'如果大家都在等别人先迈第一步，而你其实很希望事情继续，你会先行动吗？'},

  {id:'dom5',key:'dominance',pair:'dom',type:'vibe',text:'在合作关系里，“我更舒服于自己定方向和节奏，再和对方协调细节”这句话有多像你？'},
  {id:'aut5',key:'autonomy',pair:'aut',type:'vibe',text:'“越是重要、越影响我自己的事情，我越希望最后由我确认。”这句话有多像你？'},
  {id:'ms7',key:'gender_style_masc',pair:'ms',type:'vibe',text:'在比赛、挑战或有明确目标的任务里，“我会被胜负和完成目标本身点燃”这句话有多像你？'},
  {id:'fs7',key:'gender_style_fem',pair:'fs',type:'vibe',text:'“别人一点点语气或情绪变化，我往往很快就能感觉到。”这句话有多像你？'}
];

const V36_CSS = String.raw`<style id="mf01sm-v36-balanced-ux">
.personality-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.personality-card{padding:13px 14px;border-radius:16px;background:color-mix(in srgb,var(--surface-3) 88%,transparent);border:1px solid color-mix(in srgb,var(--outline) 65%,transparent)}.personality-card b{display:block;margin-bottom:4px}.personality-card strong{font-size:1.12rem;color:var(--accent);font-variant-numeric:tabular-nums}.personality-note{font-size:.82rem;color:var(--muted);margin-top:10px}.test-only-axis{margin-top:8px}.test-only-axis .axis-compare-row{grid-template-columns:minmax(120px,1.3fr) minmax(90px,.7fr) minmax(90px,.7fr)}@media(max-width:620px){.personality-summary{grid-template-columns:1fr}.test-only-axis .axis-compare-row{grid-template-columns:minmax(0,1fr) auto auto}}
</style>`;

const FINISH_V36 = String.raw`async function finish(){
const quality=responseQuality();
const scores={gender_aligned:scoreAxis('gender_aligned'),gender_cross:scoreAxis('gender_cross'),nonbinary:scoreAxis('nonbinary'),gender_style_masc:scoreAxis('gender_style_masc'),gender_style_fem:scoreAxis('gender_style_fem'),rom_m:scoreAxis('rom_m'),rom_f:scoreAxis('rom_f'),rom_nb:scoreAxis('rom_nb'),phys_m:scoreAxis('phys_m'),phys_f:scoreAxis('phys_f'),phys_nb:scoreAxis('phys_nb'),libido:scoreAxis('libido'),romantic_desire:scoreAxis('romantic_desire'),relationship_openness:scoreAxis('relationship_openness'),initiative:scoreAxis('initiative'),dominance:scoreAxis('dominance'),autonomy:scoreAxis('autonomy')};
const c01=v=>Math.max(0,Math.min(1,Number(v)));const r01=v=>Number(c01(v).toFixed(4));const is01=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
const stylePosition=clamp(50+(scores.gender_style_fem-scores.gender_style_masc)/2);scores.style_position=Math.round(stylePosition);scores.style_balance=Math.round(clamp(100-Math.abs(scores.gender_style_fem-scores.gender_style_masc)));scores.style_strength=Math.round((scores.gender_style_masc+scores.gender_style_fem)/2);scores.phys_overall=Math.max(scores.phys_m,scores.phys_f,scores.phys_nb);scores.rom_overall=Math.max(scores.rom_m,scores.rom_f,scores.rom_nb);
const genderMale=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;const genderFemale=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;const genderTotal=genderMale+genderFemale+scores.nonbinary;const genderAxis=genderTotal>0?(genderFemale+scores.nonbinary*.5)/genderTotal:.5;const pm=scores.phys_m/100,pf=scores.phys_f/100,pn=scores.phys_nb/100;const dirDen=pm+pf+pn;const attractionDirection=dirDen>0?(pf+pn*.5)/dirDen:.5;
const axes01={gender_identity:r01(genderAxis),gender_expression:r01(stylePosition/100),sexual_attraction_direction:r01(attractionDirection),sexual_attraction_intensity:r01(scores.phys_overall/100),libido:r01(scores.libido/100),romantic_tendency:r01(scores.romantic_desire/100),relationship_structure:r01(scores.relationship_openness/100),initiative01:r01(scores.initiative/100),dominance:r01(scores.dominance/100),autonomy:r01(scores.autonomy/100)};scores.axes01=axes01;
scores.m=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;scores.f=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;scores.attr_m=Math.round((scores.rom_m+scores.phys_m)/2);scores.attr_f=Math.round((scores.rom_f+scores.phys_f)/2);scores.agender=scores.nonbinary;scores.ace=Math.round(clamp(100-scores.phys_overall));scores.top=scores.initiative;scores.bot=100-scores.initiative;scores.d=scores.dominance;scores.s=100-scores.dominance;scores.trans=Math.round(clamp(50+(scores.gender_cross-scores.gender_aligned)*.6));scores.pan=Math.round(clamp(Math.min(scores.attr_m,scores.attr_f)));scores.validity=quality.score;scores.response_quality=quality.score;scores.response_quality_detail=quality;scores.duration_ms=Date.now()-state.startedAt;
const selfAxes={gender_identity:is01(state.selfLikert.gender_identity)?r01(state.selfLikert.gender_identity):null,gender_identity_special:state.selfLikert.gender_identity_special||null,gender_expression:r01(state.selfLikert.gender_expression),sexual_attraction_direction:r01(state.selfLikert.sexual_attraction_direction),sexual_attraction_intensity:r01(state.selfLikert.sexual_attraction_intensity),libido:r01(state.selfLikert.libido),romantic_tendency:r01(state.selfLikert.romantic_tendency),relationship_structure:r01(state.selfLikert.relationship_structure)};scores._self_report={axes:selfAxes};
const cmp=(self,test)=>is01(self)?{self:r01(self),test:r01(test),gap:r01(Math.abs(test-self)),signed_gap:Number((test-self).toFixed(4))}:{self:null,test:r01(test),gap:null,signed_gap:null};scores.self_test_comparison={gender_identity:cmp(selfAxes.gender_identity,axes01.gender_identity),gender_expression:cmp(selfAxes.gender_expression,axes01.gender_expression),sexual_attraction_direction:cmp(selfAxes.sexual_attraction_direction,axes01.sexual_attraction_direction),sexual_attraction_intensity:cmp(selfAxes.sexual_attraction_intensity,axes01.sexual_attraction_intensity),libido:cmp(selfAxes.libido,axes01.libido),romantic_tendency:cmp(selfAxes.romantic_tendency,axes01.romantic_tendency),relationship_structure:cmp(selfAxes.relationship_structure,axes01.relationship_structure)};const comparable=Object.values(scores.self_test_comparison).filter(v=>v&&v.gap!==null);scores.self_test_comparison.mean_absolute_gap=comparable.length?r01(comparable.reduce((a,v)=>a+v.gap,0)/comparable.length):null;
scores._schema='assigned-sex-v3.6-balanced-personality';scores._scoring='unweighted-subscale-means';scores._question_format='mixed-v36-balanced';scores._legacy_composites=['m','f','attr_m','attr_f','agender','ace','top','bot','d','s','trans','pan','validity'];scores._answers=Object.fromEntries(QUESTIONS.map((q,i)=>[q.id,state.answers[i]]));
const defs=[['gender_identity','性别认同','男性','非二元','女性'],['gender_expression','男子气 ↔ 女子气','男子气','双高/中间','女子气'],['sexual_attraction_direction','性吸引方向','男性','双 / 泛','女性'],['sexual_attraction_intensity','性吸引强度','低','中间','高'],['libido','性欲望强度','低欲望','普通','高欲望'],['romantic_tendency','浪漫倾向','无浪漫','感兴趣','浪漫倾向高'],['relationship_structure','关系结构','单偶','开放','非排他']];const specialLabels={agender:'无性',bigender:'双性',genderfluid:'流动'};const fmt=v=>Number(v).toFixed(3);let rows='<div class="axis-compare"><div class="axis-compare-row axis-compare-head"><b>光谱</b><span>自我定位</span><span>题目画像</span><span>差值</span></div>';defs.forEach(d=>{const key=d[0],c=scores.self_test_comparison[key];const selfText=key==='gender_identity'&&selfAxes.gender_identity_special?(specialLabels[selfAxes.gender_identity_special]||selfAxes.gender_identity_special):fmt(c.self);const gapText=c.gap===null?'—':fmt(c.gap);rows+='<div class="axis-compare-row"><b>'+d[1]+'</b><span>'+selfText+'</span><span>'+fmt(c.test)+'</span><span>Δ '+gapText+'</span></div>';});rows+='</div>';
const styleLabel=scores.gender_style_masc>=65&&scores.gender_style_fem>=65?'双高 / 雌雄同体风格':scores.gender_style_masc<=35&&scores.gender_style_fem<=35?'双低 / 去性别化风格':scores.gender_style_fem-scores.gender_style_masc>=18?'女子气风格偏强':scores.gender_style_masc-scores.gender_style_fem>=18?'男子气风格偏强':'两侧较均衡';
const interaction='<div class="axis-compare test-only-axis"><div class="axis-compare-row"><b>0 ↔ 1 主被动</b><span>回应 / 等待</span><span>'+fmt(axes01.initiative01)+' · 主动 / 发起</span></div><div class="axis-compare-row"><b>跟随 ↔ 主导</b><span>跟随</span><span>'+fmt(axes01.dominance)+' · 主导</span></div><div class="axis-compare-row"><b>交托 ↔ 自主</b><span>可交托</span><span>'+fmt(axes01.autonomy)+' · 自主</span></div></div>';
const personality='<div class="personality-summary"><div class="personality-card"><b>传统男子气风格</b><strong>'+scores.gender_style_masc+'/100</strong></div><div class="personality-card"><b>传统女子气风格</b><strong>'+scores.gender_style_fem+'/100</strong></div></div><div class="personality-note">'+styleLabel+'。这两项来自非性、非 self-ID 的兴趣/行为/互动题，可以同时高或同时低；“男子气/女子气”只是文化编码的实验性描述，不等于你的性别认同。</div>';
const fun=(()=>{let tag='光谱漫游者';if(scores.gender_style_masc>=72&&scores.gender_style_fem>=72)tag='双核变色龙';else if(scores.gender_style_fem>=72&&scores.initiative<48)tag='软糯小蓝莓';else if(scores.gender_style_fem>=70&&scores.dominance>=65)tag='温柔调度员';else if(scores.gender_style_masc>=72&&scores.initiative>=65)tag='硬核推进器';else if(scores.dominance>=74&&scores.autonomy>=72)tag='舰桥总指挥';else if(scores.initiative<=32&&scores.dominance<=38)tag='副驾驶小云朵';else if(scores.initiative>=76)tag='先手小火箭';else if(axes01.romantic_tendency>.78)tag='浪漫信号塔';const chips=[];chips.push(styleLabel);chips.push(axes01.initiative01>.68?'主动发起':axes01.initiative01<.32?'偏回应':'可切换节奏');chips.push(axes01.dominance>.68?'主导感强':axes01.dominance<.32?'跟随更舒服':'协商型');chips.push(axes01.autonomy>.68?'边界自主':axes01.autonomy<.32?'容易交托':'自主协商');if(axes01.sexual_attraction_intensity<.3)chips.push('低吸引频段');else if(axes01.sexual_attraction_direction>.65)chips.push('女性吸引偏强');else if(axes01.sexual_attraction_direction<.35)chips.push('男性吸引偏强');else chips.push('双向雷达');let flag='linear-gradient(135deg,#5bcefa,#f5a9b8,#fff,#b7a4ff,#5bcefa)';if(scores.gender_style_masc>=70&&scores.gender_style_fem>=70)flag='linear-gradient(135deg,#4f6fff,#c9b6ff,#fff,#ffb0d7,#ff668f)';else if(scores.gender_style_fem-scores.gender_style_masc>=18)flag='linear-gradient(135deg,#ff7eb6,#ffd4e8,#fff,#d8c4ff,#8ac7ff)';else if(scores.gender_style_masc-scores.gender_style_fem>=18)flag='linear-gradient(135deg,#4a70d8,#85b6ff,#fff,#b7e3d4,#4f8f7d)';else if(scores.dominance>=70)flag='linear-gradient(135deg,#552583,#a66dd4,#f3d8ff,#547bd1)';return{tag,chips,flag};})();scores.fun_tag=fun.tag;scores.fun_chips=fun.chips;
$('#funTag').textContent=fun.tag;$('#funChips').replaceChildren(...fun.chips.map(text=>{const span=document.createElement('span');span.className='fun-chip';span.textContent=text;return span;}));$('#result').style.setProperty('--flag-bg',fun.flag);$('#resultTitle').textContent='性别风格 × 互动方式 × 光谱画像';const qualityClass=quality.score>=80?'good':quality.score>=60?'mid':'low';$('#analysis').innerHTML='<div class="result-block"><b>非性人格 / 风格维度</b>'+personality+interaction+'</div><div class="result-block"><b>第一页自评 ↔ 题目画像</b><p>第一页仍只用于统计，不参与计分；“男子气 ↔ 女子气”的题目端完全由非性行为与兴趣题计算，不读取 self-ID。</p>'+rows+'</div><div class="result-block"><b>作答质量提示</b><p class="quality '+qualityClass+'">'+quality.score+'/100。注意力检查 '+quality.attention_passed+'/'+quality.attention_total+'，语义平行题一致度 '+quality.pair_score+'/100，平均 '+quality.ms_per_item+' ms/题。</p></div>';
$('#bars').replaceChildren();const barDefs=[...defs,['initiative01','0 / 1 主被动','回应','中间','主动'],['dominance','跟随 / 主导','跟随','协商','主导'],['autonomy','交托 / 自主','交托','协商','自主']];barDefs.forEach(d=>{const value=axes01[d[0]];const row=document.createElement('div');row.className='barrow';row.innerHTML='<span>'+d[1]+'</span><span><span class="bartrack"><span style="width:'+(value*100)+'%"></span></span><span class="axis-result-labels"><span>'+d[2]+'</span><span>'+d[3]+'</span><span>'+d[4]+'</span></span></span><b>'+fmt(value)+'</b>';$('#bars').appendChild(row);});const note=document.querySelector('#result .note.tiny');if(note)note.textContent='v3.6 将非性人格/互动放回主体：男子气/女子气是独立的文化编码风格分，不是性别认同；0/1 是日常互动的回应↔发起；跟随↔主导是非性人际控制偏好。';show('result');try{await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:'3.6.0',nickname:state.nickname,age:state.age,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfLikert:state.selfLikert,location:state.location,gender:state.assignGender,tag:fun.tag,scores,timestamp:Date.now()})});}catch(e){console.error('Archive Failed',e);}}
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
function validV36Scores(scores) {
  if (scores._schema !== V36_SCHEMA || scores._scoring !== 'unweighted-subscale-means' || scores._question_format !== QUESTION_FORMAT) return false;
  if (!SCORE_KEYS.every(key => validScore(scores[key]))) return false;
  const answers = parseObject(scores._answers);
  if (!ANSWER_IDS.every(id => Number.isInteger(answers[id]) && answers[id] >= 1 && answers[id] <= 5)) return false;
  const quality = parseObject(scores.response_quality_detail);
  const thresholds = parseObject(quality.run_thresholds);
  if (quality.attention_total !== 2 || !validScore(scores.response_quality) || thresholds.mild !== 15 || thresholds.mid !== 19 || thresholds.severe !== 25) return false;
  const axes = parseObject(scores.axes01);
  if (!RESULT_AXES.every(key => valid01(axes[key]))) return false;
  const selfAxes = parseObject(parseObject(scores._self_report).axes);
  const genderNumeric = valid01(selfAxes.gender_identity);
  const genderSpecial = GENDER_SPECIAL.has(selfAxes.gender_identity_special);
  if (genderNumeric === genderSpecial) return false;
  for (const key of BASELINE_AXES.slice(1)) if (!valid01(selfAxes[key])) return false;
  return true;
}

async function saveV36(request, env, data) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 256000) return json({ error: 'payload too large' }, 413);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);
  const nickname = text(data.nickname, 80);
  const age = Number(data.age);
  const assignGender = data.gender === 'AMAB' || data.gender === 'AFAB' ? data.gender : '';
  if (!nickname || !Number.isInteger(age) || age < 13 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const scores = parseObject(data.scores);
  if (!validV36Scores(scores)) return json({ error: 'questionnaire schema/version mismatch' }, 400);
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
    console.error('mf01sm.v36-d1-save', error);
  }
  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version: VERSION, nickname, age, gender: assignGender, location, ip, d1_synced: false, timestamp }));
    return json({ success: true, d1: false, kv: true, version: VERSION });
  } catch (error) {
    console.error('mf01sm.v36-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

function replaceQuestions(html) {
  const start = html.indexOf('const QUESTIONS=');
  const end = start >= 0 ? html.indexOf(';const LABELS=', start) : -1;
  if (start < 0 || end <= start) return html;
  return html.slice(0, start) + `const QUESTIONS=${JSON.stringify(QUESTIONS_V36)}` + html.slice(end);
}
function replaceFinish(html) {
  const start = html.indexOf('async function finish(){');
  const end = start >= 0 ? html.indexOf('</script>', start) : -1;
  if (start < 0 || end <= start) return html;
  return html.slice(0, start) + FINISH_V36 + html.slice(end);
}
function patchMain(html) {
  html = html.replaceAll('3.5.0', VERSION);
  html = replaceQuestions(html);
  html = replaceFinish(html);
  html = html.replace('</head>', `${V36_CSS}</head>`);
  return html;
}
function patchAdmin(html) {
  const marker = "let scoreText;if(String(item.version||'').startsWith('3.5')){";
  const branch = "let scoreText;if(String(item.version||'').startsWith('3.6')){const ax=sc.axes01||{};const f=v=>Number.isFinite(Number(v))?Number(v).toFixed(3):'-';scoreText='G:'+f(ax.gender_identity)+' 男气:'+Math.round(sc.gender_style_masc||0)+' 女气:'+Math.round(sc.gender_style_fem||0)+' 01:'+f(ax.initiative01)+' 主导:'+f(ax.dominance)+' 自主:'+f(ax.autonomy)+' | 吸向:'+f(ax.sexual_attraction_direction)+' 性吸:'+f(ax.sexual_attraction_intensity)+' 欲:'+f(ax.libido)+' 浪:'+f(ax.romantic_tendency)+' | 质量:'+Math.round(sc.response_quality||0)+' 注:'+Math.round((sc.response_quality_detail||{}).attention_passed||0)+'/'+Math.round((sc.response_quality_detail||{}).attention_total||0)+' 平行:'+Math.round((sc.response_quality_detail||{}).pair_score||0)+' 速:'+Math.round((sc.response_quality_detail||{}).ms_per_item||0)+'ms/题';}else if(String(item.version||'').startsWith('3.5')){";
  return html.replace(marker, branch);
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/api/save' && request.method === 'POST') {
    let data;
    try { data = await request.clone().json(); }
    catch { return json({ error: 'invalid JSON' }, 400); }
    if (text(data?.version, 24) === VERSION) return saveV36(request, env, data);
    return v35Runtime.fetch(request, env, ctx);
  }
  const response = await v35Runtime.fetch(request, env, ctx);
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
