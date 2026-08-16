import v34Runtime from './v34-runtime.js';

const VERSION = '3.5.0';
const V35_SCHEMA = 'assigned-sex-v3.5-mixed-format';
const QUESTION_FORMAT = 'mixed-v35';

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
  'gender_identity','gender_expression','sexual_attraction_direction','sexual_attraction_intensity',
  'libido','romantic_tendency','relationship_structure'
];
const GENDER_SPECIAL = new Set(['agender','bigender','genderfluid']);

const QUESTIONS_V35 = [
  {id:'ga1',key:'gender_aligned',pair:'ga',type:'cards',text:'有人第一次见你，顺手按出生指派性别称呼你。你的内心弹幕更接近哪条？',options:['完全叫错频道了','有点别扭','无所谓，先聊再说','还挺自然','对，就是这样叫我']},
  {id:'em1',key:'expression_masc',pair:'em',type:'slider',text:'今天没人管你怎么打扮：你有多想让整体呈现更男性化？',anchors:['完全不想往这边','随当天心情','非常想往这边']},
  {id:'rm1',key:'rom_m',pair:'rm',type:'likelihood',text:'一位正中你审美的男性约你单独看夜景，你会把它想成“可能有点恋爱味”的邀请吗？'},
  {id:'rn1',key:'rom_nb',pair:'rn',type:'likelihood',text:'一位很戳你的非二元 / 性别多元的人约你单独出去，你会期待它发展出恋爱意味吗？'},
  {id:'init1',key:'initiative',pair:'init',type:'cards',text:'两个人都说“随便”，外卖页面已经卡了五分钟。你通常会？',options:['继续等对方决定','给几个模糊建议','一起再看看','直接缩成两三个方案','拍板一个方案把事情推进']},
  {id:'gc1',key:'gender_cross',pair:'gc',type:'cards',text:'有人自然把你当作与出生指派性别不同的一侧，你的内心弹幕更接近哪条？',options:['完全不对，快改回来','有点不适应','无所谓','欸，好像挺顺','对，这反而更像我']},
  {id:'rf1',key:'rom_f',pair:'rf',type:'likelihood',text:'一位正中你审美的女性约你单独看夜景，你会把它想成“可能有点恋爱味”的邀请吗？'},
  {id:'pn1',key:'phys_nb',pair:'pn',type:'intensity',text:'遇到很合胃口的非二元 / 性别多元的人时，你的身体层面吸引感通常有多明显？'},
  {id:'aut1',key:'autonomy',type:'slider',text:'重要决定主要影响你本人时，你希望最终决定权放在哪里？',anchors:['交给对方也可以','一起商量','我得保留最后决定权']},
  {id:'nb1',key:'nonbinary',pair:'nb',type:'cards',text:'角色创建器开局只给“男 / 女”两个按钮。你的第一反应更像？',options:['正好，直接选一个','基本够用','都行','有点想找更多选项','等等，第三个按钮在哪里？']},
  {id:'pm1',key:'phys_m',pair:'pm',type:'intensity',text:'遇到很合胃口的男性时，你的身体层面吸引感通常有多明显？'},
  {id:'lib1',key:'libido',pair:'lib',type:'frequency',text:'完全没有具体对象时，性方面的欲望或冲动自己冒出来的频率大概是？'},
  {id:'ga2',key:'gender_aligned',type:'slider',text:'如果身体性别特征可以安全、自由地调整，你有多想保留或靠近出生指派性别的方向？',anchors:['完全不想','看情况','很想保留 / 靠近']},
  {id:'pf1',key:'phys_f',pair:'pf',type:'intensity',text:'遇到很合胃口的女性时，你的身体层面吸引感通常有多明显？'},
  {id:'rd1',key:'romantic_desire',pair:'rd',type:'desire',text:'即使现在没有特定喜欢的人，你对“拥有一段恋爱关系”本身有多想要？'},
  {id:'gc2',key:'gender_cross',type:'slider',text:'如果身体性别特征可以安全、自由地调整，你有多想让其中一些朝出生指派性别不同的一侧发展？',anchors:['完全不想','看情况','很想往这边调整']},
  {id:'ro1',key:'relationship_openness',type:'comfort',text:'伴侣提出：双方可以在边界清楚、彼此知情同意的前提下，保留一些与别人约会或亲密的空间。你会有多舒服？'},
  {id:'check1',attention:4,type:'cards',text:'突然有一只 🦆 抢走了问卷。鸭长官说：为了证明你在看题，请点第四个选项。',options:['继续发呆','给鸭鸭鼓掌','假装没看见','收到，鸭长官 🫡','把鸭鸭抱走']},
  {id:'rm2',key:'rom_m',type:'cards',text:'一位你很有好感的男性发来“到家告诉我”。你的心里更容易把这句话放在哪个频道？',options:['普通社交，没有特别感觉','稍微有点在意','可能只是朋友，也可能不止','会觉得有点暧昧可爱','心动，会期待被他特别关心']},
  {id:'ef1',key:'expression_fem',pair:'ef',type:'slider',text:'今天没人管你怎么打扮：你有多想让整体呈现更女性化？',anchors:['完全不想往这边','随当天心情','非常想往这边']},
  {id:'nb2',key:'nonbinary',type:'comfort',text:'有人认真告诉你：“你不必把自己固定塞进男或女中的一个格子。”这句话让你有多自在？'},
  {id:'rf2',key:'rom_f',type:'cards',text:'一位你很有好感的女性发来“到家告诉我”。你的心里更容易把这句话放在哪个频道？',options:['普通社交，没有特别感觉','稍微有点在意','可能只是朋友，也可能不止','会觉得有点暧昧可爱','心动，会期待被她特别关心']},
  {id:'mp1',key:'multi_partner',pair:'mp',type:'likelihood',text:'所有相关者都知情同意、边界也说清楚时，你能想象自己同时认真维持不止一段恋爱关系吗？'},
  {id:'init2',key:'initiative',type:'likelihood',text:'聊天冷掉了，但你其实还想继续。你主动丢一个新话题把它救回来的可能性？'},
  {id:'ga3',key:'gender_aligned',type:'slider',text:'想象十年后的自己，继续长期以出生指派性别生活，这幅画面对你有多自然？',anchors:['非常不自然','说不上来','非常自然']},
  {id:'aut2',key:'autonomy',pair:'aut',type:'comfort',text:'伴侣说：“这件事影响你最多，所以我会给意见，但最后由你决定。”你听到这句话有多舒服？'},
  {id:'rn2',key:'rom_nb',type:'cards',text:'一位很戳你的非二元 / 性别多元的人说“今天第一时间想到你”。你的心跳频道更像？',options:['普通朋友频道','有一点特别','半半，得看后续','明显有点暧昧','会很心动，想继续靠近']},
  {id:'gc3',key:'gender_cross',type:'slider',text:'想象十年后的自己，以与出生指派性别不同的一侧生活，这幅画面对你有多自然？',anchors:['非常不自然','说不上来','非常自然']},
  {id:'pm2',key:'phys_m',pair:'pm',type:'likelihood',text:'在安全、自愿、彼此有好感的前提下，你会想和一位很符合偏好的男性有更亲近的身体距离吗？'},
  {id:'ro2',key:'relationship_openness',pair:'ro',type:'cards',text:'伴侣先来和你商量：“我对另一个人也有好感，我们要不要认真讨论一下开放边界？”你的第一反应更像？',options:['这个概念本身就不行','大概率不能接受','可以听完再判断','愿意认真讨论规则','只要透明自愿，我会对尝试有兴趣']},
  {id:'rf3',key:'rom_f',pair:'rf',type:'desire',text:'如果你真的很喜欢一位女性，你有多想让你们的关系带上明确的恋爱意味？'},
  {id:'nb3',key:'nonbinary',type:'slider',text:'你的性别体验更像落在哪里？',anchors:['清楚落在男 / 女中的一端','会在边界附近游走','二元框本身就装不太下']},
  {id:'pf2',key:'phys_f',pair:'pf',type:'likelihood',text:'在安全、自愿、彼此有好感的前提下，你会想和一位很符合偏好的女性有更亲近的身体距离吗？'},
  {id:'lib2',key:'libido',type:'frequency',text:'普通的一周里，性方面的念头在没有刻意寻找时自然出现的频率？'},
  {id:'rm3',key:'rom_m',pair:'rm',type:'desire',text:'如果你真的很喜欢一位男性，你有多想让你们的关系带上明确的恋爱意味？'},
  {id:'em2',key:'expression_masc',type:'cards',text:'周末出门，衣柜完全听你的。你更容易拿起哪一类搭配？',options:['明显往女性化方向拿','略偏女性化','中性 / 随便舒服就好','略偏男性化','明显往男性化方向拿']},
  {id:'pm3',key:'phys_m',type:'frequency',text:'刷到或遇到很戳你的男性时，“想更靠近一点”的身体吸引感出现得有多常？'},
  {id:'init3',key:'initiative',type:'cards',text:'朋友群里说“周末出去玩吧”，然后所有人都只回“都行”。你更可能？',options:['等别人安排','偶尔补一句想法','大家一起慢慢定','先列几个可行方案','直接拉时间表 / 地点把计划落地']},
  {id:'rd2',key:'romantic_desire',type:'slider',text:'理想未来里，“有一位恋爱伴侣”这件事对画面的加分有多大？',anchors:['没有也完全圆满','有无都可以','有会明显更完整']},
  {id:'check2',attention:2,type:'cards',text:'第二只检查员 🐈 出场：猫猫要求你点第二个选项，然后它就放你继续。',options:['汪，收到','喵，收到','咕，收到','啾，收到','假装没听见']},
  {id:'ga4',key:'gender_aligned',pair:'ga',type:'vibe',text:'完全没有任何外界期待时，“长期按出生指派性别被别人理解”这件事有多像你？'},
  {id:'pf3',key:'phys_f',type:'frequency',text:'刷到或遇到很戳你的女性时，“想更靠近一点”的身体吸引感出现得有多常？'},
  {id:'aut3',key:'autonomy',pair:'aut',type:'cards',text:'一件事主要影响你本人，但对方确实很可靠。你更舒服的模式是？',options:['基本让对方决定','对方决定，我补充','共同决定','我主导，对方给意见','我的事由我最后拍板']},
  {id:'gc4',key:'gender_cross',pair:'gc',type:'vibe',text:'完全没有任何外界期待时，“让称呼或性别呈现更接近出生指派性别不同的一侧”这件事有多像你？'},
  {id:'pn2',key:'phys_nb',type:'likelihood',text:'在安全、自愿、彼此有好感的前提下，你会想和一位很符合偏好的非二元 / 性别多元的人有更亲近的身体距离吗？'},
  {id:'nb4',key:'nonbinary',pair:'nb',type:'comfort',text:'别人不急着把你固定进“男性 / 女性”的单一格子，而是允许你自己慢慢定义，你有多放松？'},
  {id:'init4',key:'initiative',pair:'init',type:'likelihood',text:'如果两个人都在等对方先迈一步，但你其实很想继续，你会先行动吗？'},
  {id:'ef2',key:'expression_fem',type:'cards',text:'周末出门，衣柜完全听你的。你更容易拿起哪一类搭配？',options:['明显往男性化方向拿','略偏男性化','中性 / 随便舒服就好','略偏女性化','明显往女性化方向拿']},
  {id:'aut4',key:'autonomy',type:'slider',text:'亲密关系越重要，你越希望“关于你自己的重要事情”由谁握最后决定权？',anchors:['对方主导也可以','充分协商','我保留最后决定权']},
  {id:'rn3',key:'rom_nb',pair:'rn',type:'desire',text:'如果你真的很喜欢一位非二元 / 性别多元的人，你有多想让关系带上明确的恋爱意味？'},
  {id:'lib3',key:'libido',type:'intensity',text:'如果很长一段时间完全没有任何性方面的活动或释放，你会多明显地感觉到“身体在提醒我这件事”？'},
  {id:'ro3',key:'relationship_openness',type:'vibe',text:'“长期关系不一定必须绝对排他，只要边界透明而且所有人都同意。”这句话有多像你的关系观？'},
  {id:'em3',key:'expression_masc',pair:'em',type:'vibe',text:'别人说“你今天整体气质很男性化”，你会觉得这个形容有多贴近自己？'},
  {id:'pn3',key:'phys_nb',pair:'pn',type:'frequency',text:'刷到或遇到很戳你的非二元 / 性别多元的人时，“想更靠近一点”的身体吸引感出现得有多常？'},
  {id:'rd3',key:'romantic_desire',type:'cards',text:'想象一个你很满意的未来住处。恋爱伴侣在这个画面里的位置更像？',options:['完全不需要出现','出现也行，不出现也行','有一点会更好','是很重要的一部分','几乎是理想生活的核心拼图']},
  {id:'ef3',key:'expression_fem',pair:'ef',type:'vibe',text:'别人说“你今天整体气质很女性化”，你会觉得这个形容有多贴近自己？'},
  {id:'lib4',key:'libido',pair:'lib',type:'slider',text:'如果给自己的“性欲旋钮”随手拧一个位置，它通常更靠哪边？',anchors:['几乎静音','中间档','存在感很强']},
  {id:'mp2',key:'multi_partner',type:'comfort',text:'伴侣同时拥有另一段重要恋爱关系，但你们边界透明、每个人都知情同意。你对此会有多舒服？'},
  {id:'rd4',key:'romantic_desire',pair:'rd',type:'slider',text:'如果给自己的“恋爱关系向往旋钮”拧一个位置，它通常更靠哪边？',anchors:['几乎没有','随缘','非常向往']},
  {id:'ro4',key:'relationship_openness',pair:'ro',type:'likelihood',text:'规则清楚、所有相关者都同意的情况下，你实际尝试开放式关系安排的可能性有多大？'},
  {id:'mp3',key:'multi_partner',type:'cards',text:'如果世界观设定允许“所有人知情同意的多伴侣恋爱网络”，你对自己加入这种关系的直觉更像？',options:['会主动避开','大概率不适合我','得看具体的人和边界','可以认真考虑','听起来就很有吸引力']},
  {id:'mp4',key:'multi_partner',pair:'mp',type:'desire',text:'相比只拥有一位恋爱伴侣，你对“同时拥有多位知情同意的恋爱伴侣”本身有多大实际兴趣？'}
];

const BASELINE_SECTION_V35 = String.raw`<section id="baseline" class="card hidden"><h2>光谱自我定位</h2><div class="note tiny baseline-stat-note"><b>这一页不会参与测试计分。</b>所有连续轴只用于统计，以及之后把“你自己怎么定位”与题目得到的画像做对照。拖动结果按 0–1 小数保存，不会替你决定身份标签。</div><div class="field"><label>出生指派性别</label><div class="grid" data-field="assignGender"><button class="choice" data-value="AMAB" type="button">AMAB（出生时指派为男）</button><button class="choice" data-value="AFAB" type="button">AFAB（出生时指派为女）</button></div></div>
<div class="axis-field gender-axis-field"><div class="axis-heading"><b>性别认同</b><output id="axisOutGender" class="axis-value">未选择</output></div><input id="axisGender" class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性别认同连续轴"><div class="axis-labels"><span>男性</span><span>非二元</span><span>女性</span></div><div class="gender-special-title">或选择轴外状态（与上方连续轴四选一）</div><div id="genderSpecials" class="gender-specials"><button class="choice gender-special" data-special="agender" type="button">无性 <small>Agender</small></button><button class="choice gender-special" data-special="bigender" type="button">双性 <small>Bigender</small></button><button class="choice gender-special" data-special="genderfluid" type="button">流动 <small>Genderfluid</small></button></div></div>
<div class="axis-field" data-axis="gender_expression"><div class="axis-heading"><b>性别表达</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性别表达连续轴"><div class="axis-labels"><span>高度男性化</span><span>雌雄同体</span><span>高度女性化</span></div></div>
<div class="axis-field" data-axis="sexual_attraction_direction"><div class="axis-heading"><b>性吸引方向</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性吸引方向连续轴"><div class="axis-labels"><span>男性</span><span>双 / 泛</span><span>女性</span></div></div>
<div class="axis-field" data-axis="sexual_attraction_intensity"><div class="axis-heading"><b>性吸引强度</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性吸引强度连续轴"><div class="axis-labels"><span>几乎没有</span><span>灰区 / 中间</span><span>很明显</span></div></div>
<div class="axis-field" data-axis="libido"><div class="axis-heading"><b>性欲望 / 性冲动强度</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="性欲望强度连续轴"><div class="axis-labels"><span>低欲望</span><span>普通</span><span>高欲望</span></div></div>
<div class="axis-field" data-axis="romantic_tendency"><div class="axis-heading"><b>浪漫倾向</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="浪漫倾向连续轴"><div class="axis-labels"><span>无浪漫倾向</span><span>感兴趣</span><span>浪漫倾向高</span></div></div>
<div class="axis-field" data-axis="relationship_structure"><div class="axis-heading"><b>单偶 / 开放 / 多偶</b><output class="axis-value">未选择</output></div><input class="spectrum-range" type="range" min="0" max="1" step="0.001" value="0.5" aria-label="关系结构连续轴"><div class="axis-labels"><span>单偶</span><span>开放</span><span>多偶</span></div></div>
<div class="actions"><button id="baselineNext" class="button" type="button">进入测试 ✨</button></div></section>`;

const RESULT_SECTION_V35 = String.raw`<section id="result" class="card hidden"><span class="pill">v3.5.0 结果</span><div class="result-fun-head"><div id="funTag" class="fun-tag"></div><div id="funChips" class="fun-chips"></div></div><div id="resultTitle" class="result-title"></div><div id="analysis"></div><h3>你的连续光谱</h3><div id="bars" class="bars"></div><div class="note tiny">0 表示光谱左端，1 表示右端；中间值是连续位置。模糊旗帜背景和娱乐性 tag 只是结果页彩蛋，不是身份诊断或分类。</div><div class="actions result-actions"><button class="button secondary" type="button" onclick="location.reload()">再测一次</button><a class="button" href="https://test.lunarlab.uk/">返回 Test 首页 · 更多测试</a></div></section>`;

const V35_CSS = String.raw`<style id="mf01sm-v35-fun-ux">
.baseline-stat-note{margin:4px 0 18px}.quiz-choice-grid{display:grid;gap:10px}.quiz-card-option{display:grid;grid-template-columns:32px minmax(0,1fr);gap:11px;align-items:center;width:100%;min-height:58px;padding:12px 14px;border:1px solid var(--outline);border-radius:17px;background:var(--surface-2);color:var(--text);text-align:left;cursor:pointer;transition:transform .16s ease,background .16s ease,border-color .16s ease}.quiz-card-option:hover{transform:translateY(-1px);border-color:var(--accent)}.quiz-card-option.active{background:var(--accent-container);border-color:var(--accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 50%,transparent)}.quiz-card-option .opt-dot{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:var(--surface-4);font-size:.76rem;font-weight:850}.quiz-card-option.active .opt-dot{background:var(--accent);color:var(--on-accent)}.q-kicker{display:inline-flex;margin-bottom:8px;padding:4px 9px;border-radius:999px;background:var(--surface-3);color:var(--muted);font-size:.74rem;font-weight:800;letter-spacing:.02em}.q-text{display:block}.slider-question{display:grid;gap:12px;padding:8px 2px}.answer-range{width:100%;height:36px;appearance:none;-webkit-appearance:none;background:transparent;cursor:grab}.answer-range::-webkit-slider-runnable-track{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--surface-4),var(--accent),var(--surface-4))}.answer-range::-moz-range-track{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--surface-4),var(--accent),var(--surface-4))}.answer-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:26px;height:26px;margin-top:-9px;border:3px solid var(--surface-1);border-radius:50%;background:var(--accent);box-shadow:0 2px 8px rgba(0,0,0,.25)}.answer-range::-moz-range-thumb{width:22px;height:22px;border:3px solid var(--surface-1);border-radius:50%;background:var(--accent)}.answer-slider-value{text-align:center;font-weight:850;color:var(--accent);min-height:1.5em}.answer-anchors{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:.77rem;color:var(--muted)}.answer-anchors span:nth-child(2){text-align:center}.answer-anchors span:last-child{text-align:right}#result{position:relative;overflow:hidden;isolation:isolate;--flag-bg:linear-gradient(180deg,#5bcefa,#f5a9b8,#fff,#f5a9b8,#5bcefa)}#result::before{content:"";position:absolute;z-index:0;inset:-22%;background:var(--flag-bg);filter:blur(42px) saturate(1.25);opacity:.28;transform:scale(1.06)}#result>*{position:relative;z-index:1}.result-fun-head{display:grid;gap:10px;margin:14px 0 12px}.fun-tag{font-size:clamp(26px,6vw,44px);font-weight:950;line-height:1.08;letter-spacing:-.03em;text-shadow:0 2px 22px color-mix(in srgb,var(--surface-1) 80%,transparent)}.fun-chips{display:flex;gap:8px;flex-wrap:wrap}.fun-chip{display:inline-flex;padding:6px 10px;border-radius:999px;background:color-mix(in srgb,var(--surface-2) 80%,transparent);border:1px solid color-mix(in srgb,var(--outline) 65%,transparent);backdrop-filter:blur(12px);font-size:.82rem;font-weight:750}.result-actions a.button{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.axis-compare-row{backdrop-filter:blur(10px);background:color-mix(in srgb,var(--surface-3) 84%,transparent)!important}@media(max-width:620px){.quiz-card-option{min-height:56px;padding:11px}.fun-tag{font-size:clamp(25px,10vw,38px)}.result-actions{display:grid}.result-actions>*{width:100%}}
</style>`;

const V35_BASELINE_JS = String.raw`<script id="mf01sm-v35-spectrum-js">(()=>{const fmt=v=>Number(v).toFixed(3);const setNormal=(key,input,out)=>{const select=()=>{const value=Number(input.value);input.dataset.touched='1';state.selfLikert[key]=value;out.textContent=fmt(value);if(key==='sexual_attraction_direction')state.selfOrientation='性吸引方向:'+fmt(value);};input.addEventListener('input',select);input.addEventListener('pointerdown',select);input.addEventListener('keydown',select);};document.querySelectorAll('[data-axis]').forEach(box=>{const key=box.dataset.axis,input=box.querySelector('.spectrum-range'),out=box.querySelector('.axis-value');if(input&&out)setNormal(key,input,out);});const gender=document.getElementById('axisGender'),genderOut=document.getElementById('axisOutGender'),specials=[...document.querySelectorAll('[data-special]')];const useGenderAxis=()=>{const value=Number(gender.value);gender.dataset.touched='1';specials.forEach(btn=>btn.classList.remove('active'));state.selfLikert.gender_identity=value;state.selfLikert.gender_identity_special=null;state.selfGender='性别轴:'+fmt(value);genderOut.textContent=fmt(value);};gender?.addEventListener('input',useGenderAxis);gender?.addEventListener('pointerdown',useGenderAxis);gender?.addEventListener('keydown',useGenderAxis);const specialLabels={agender:'无性',bigender:'双性',genderfluid:'流动'};specials.forEach(btn=>btn.addEventListener('click',()=>{specials.forEach(x=>x.classList.toggle('active',x===btn));state.selfLikert.gender_identity=null;state.selfLikert.gender_identity_special=btn.dataset.special;state.selfGender=specialLabels[btn.dataset.special]||btn.dataset.special;genderOut.textContent=state.selfGender;}));const required=['gender_expression','sexual_attraction_direction','sexual_attraction_intensity','libido','romantic_tendency','relationship_structure'];document.getElementById('baselineNext')?.addEventListener('click',event=>{const genderSelected=Number.isFinite(state.selfLikert.gender_identity)||!!state.selfLikert.gender_identity_special;const missing=required.filter(key=>!Number.isFinite(state.selfLikert[key]));if(!state.assignGender||!genderSelected||missing.length){event.stopImmediatePropagation();alert('请完成出生指派性别和全部连续光谱；性别认同也可以选择无性、双性或流动。');}},true);})();</script>`;

const RENDER_V35 = String.raw`function render(){const q=QUESTIONS[state.index];const typeNames={cards:'剧情选择',frequency:'出现频率',comfort:'舒适度',likelihood:'可能性',vibe:'直觉贴合',desire:'想不想',intensity:'强度',slider:'拖动选择'};$('#qIndex').textContent=(typeNames[q.type]||'选择题')+' · '+(state.index+1)+' / '+QUESTIONS.length;$('#progress').style.width=((state.index+1)/QUESTIONS.length*100)+'%';const question=$('#question');question.innerHTML='';const kicker=document.createElement('span');kicker.className='q-kicker';kicker.textContent=typeNames[q.type]||'选择题';const textNode=document.createElement('span');textNode.className='q-text';textNode.textContent=q.text;question.append(kicker,textNode);const root=$('#scale');root.innerHTML='';const sets={frequency:['从来没有','偶尔闪现','有时会','经常如此','几乎就是日常'],comfort:['想躲远一点','有点不舒服','看情况','挺舒服','非常自在'],likelihood:['基本不会','大概不会','看情况','很可能会','几乎一定会'],vibe:['完全不像我','有点不像','一半一半','挺像我的','这就是我'],desire:['完全不想','不太想','随缘','挺想','非常想'],intensity:['几乎没有','很轻','中等','明显','非常强']};if(q.type==='slider'){root.className='scale slider-question';const input=document.createElement('input');input.type='range';input.min='1';input.max='5';input.step='1';input.value=state.answers[state.index]??3;input.className='answer-range';input.setAttribute('aria-label','拖动选择');const value=document.createElement('div');value.className='answer-slider-value';value.textContent=state.answers[state.index]===null?'拖一下才算作答':'位置 '+state.answers[state.index]+' / 5';const anchors=document.createElement('div');anchors.className='answer-anchors';(q.anchors||['左侧','中间','右侧']).forEach(t=>{const s=document.createElement('span');s.textContent=t;anchors.appendChild(s);});const choose=()=>{state.answers[state.index]=Number(input.value);value.textContent='位置 '+state.answers[state.index]+' / 5';};input.addEventListener('input',choose);input.addEventListener('pointerdown',choose);input.addEventListener('keydown',choose);root.append(input,value,anchors);}else{root.className='scale quiz-choice-grid';const options=q.options||sets[q.type]||sets.vibe;options.forEach((label,i)=>{const answer=i+1;const btn=document.createElement('button');btn.type='button';btn.className='quiz-card-option'+(state.answers[state.index]===answer?' active':'');const dot=document.createElement('span');dot.className='opt-dot';dot.textContent=String.fromCharCode(65+i);const copy=document.createElement('span');copy.textContent=label;btn.append(dot,copy);btn.addEventListener('click',()=>{state.answers[state.index]=answer;render();});root.appendChild(btn);});}$('#prev').style.visibility=state.index===0?'hidden':'visible';$('#prev').textContent='← 上一幕';$('#next').textContent=state.index===QUESTIONS.length-1?'看看我的光谱 ✨':'下一幕 →';}`;

const FINISH_V35 = String.raw`async function finish(){
const quality=responseQuality();
const scores={gender_aligned:scoreAxis('gender_aligned'),gender_cross:scoreAxis('gender_cross'),nonbinary:scoreAxis('nonbinary'),expression_masc:scoreAxis('expression_masc'),expression_fem:scoreAxis('expression_fem'),rom_m:scoreAxis('rom_m'),rom_f:scoreAxis('rom_f'),rom_nb:scoreAxis('rom_nb'),phys_m:scoreAxis('phys_m'),phys_f:scoreAxis('phys_f'),phys_nb:scoreAxis('phys_nb'),libido:scoreAxis('libido'),romantic_desire:scoreAxis('romantic_desire'),relationship_openness:scoreAxis('relationship_openness'),multi_partner:scoreAxis('multi_partner'),initiative:scoreAxis('initiative'),autonomy:scoreAxis('autonomy')};
const c01=v=>Math.max(0,Math.min(1,Number(v)));const r01=v=>Number(c01(v).toFixed(4));const is01=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
scores.expression_position=Math.round(clamp(50+(scores.expression_fem-scores.expression_masc)/2));scores.expression_balance=Math.round(clamp(100-Math.abs(scores.expression_fem-scores.expression_masc)));scores.phys_overall=Math.max(scores.phys_m,scores.phys_f,scores.phys_nb);scores.rom_overall=Math.max(scores.rom_m,scores.rom_f,scores.rom_nb);
const genderMale=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;const genderFemale=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;const genderTotal=genderMale+genderFemale+scores.nonbinary;const genderAxis=genderTotal>0?(genderFemale+scores.nonbinary*.5)/genderTotal:.5;const pm=scores.phys_m/100,pf=scores.phys_f/100,pn=scores.phys_nb/100;const dirDen=pm+pf+pn;const attractionDirection=dirDen>0?(pf+pn*.5)/dirDen:.5;
const axes01={gender_identity:r01(genderAxis),gender_expression:r01(scores.expression_position/100),sexual_attraction_direction:r01(attractionDirection),sexual_attraction_intensity:r01(scores.phys_overall/100),libido:r01(scores.libido/100),romantic_tendency:r01(scores.romantic_desire/100),relationship_structure:r01((scores.relationship_openness+scores.multi_partner)/200)};scores.axes01=axes01;
scores.m=state.assignGender==='AMAB'?scores.gender_aligned:scores.gender_cross;scores.f=state.assignGender==='AMAB'?scores.gender_cross:scores.gender_aligned;scores.attr_m=Math.round((scores.rom_m+scores.phys_m)/2);scores.attr_f=Math.round((scores.rom_f+scores.phys_f)/2);scores.agender=scores.nonbinary;scores.ace=Math.round(clamp(100-scores.phys_overall));scores.top=scores.initiative;scores.bot=100-scores.initiative;scores.d=scores.autonomy;scores.s=100-scores.autonomy;scores.trans=Math.round(clamp(50+(scores.gender_cross-scores.gender_aligned)*.6));scores.pan=Math.round(clamp(Math.min(scores.attr_m,scores.attr_f)));scores.validity=quality.score;scores.response_quality=quality.score;scores.response_quality_detail=quality;scores.duration_ms=Date.now()-state.startedAt;
const selfAxes={gender_identity:is01(state.selfLikert.gender_identity)?r01(state.selfLikert.gender_identity):null,gender_identity_special:state.selfLikert.gender_identity_special||null,gender_expression:r01(state.selfLikert.gender_expression),sexual_attraction_direction:r01(state.selfLikert.sexual_attraction_direction),sexual_attraction_intensity:r01(state.selfLikert.sexual_attraction_intensity),libido:r01(state.selfLikert.libido),romantic_tendency:r01(state.selfLikert.romantic_tendency),relationship_structure:r01(state.selfLikert.relationship_structure)};scores._self_report={axes:selfAxes};
const cmp=(self,test)=>is01(self)?{self:r01(self),test:r01(test),gap:r01(Math.abs(test-self)),signed_gap:Number((test-self).toFixed(4))}:{self:null,test:r01(test),gap:null,signed_gap:null};scores.self_test_comparison={gender_identity:cmp(selfAxes.gender_identity,axes01.gender_identity),gender_expression:cmp(selfAxes.gender_expression,axes01.gender_expression),sexual_attraction_direction:cmp(selfAxes.sexual_attraction_direction,axes01.sexual_attraction_direction),sexual_attraction_intensity:cmp(selfAxes.sexual_attraction_intensity,axes01.sexual_attraction_intensity),libido:cmp(selfAxes.libido,axes01.libido),romantic_tendency:cmp(selfAxes.romantic_tendency,axes01.romantic_tendency),relationship_structure:cmp(selfAxes.relationship_structure,axes01.relationship_structure)};const comparable=Object.values(scores.self_test_comparison).filter(v=>v&&v.gap!==null);scores.self_test_comparison.mean_absolute_gap=comparable.length?r01(comparable.reduce((a,v)=>a+v.gap,0)/comparable.length):null;
scores._schema='assigned-sex-v3.5-mixed-format';scores._scoring='unweighted-subscale-means';scores._question_format='mixed-v35';scores._legacy_composites=['m','f','attr_m','attr_f','agender','ace','top','bot','d','s','trans','pan','validity'];scores._answers=Object.fromEntries(QUESTIONS.map((q,i)=>[q.id,state.answers[i]]));
const defs=[['gender_identity','性别认同','男性','非二元','女性'],['gender_expression','性别表达','高度男性化','雌雄同体','高度女性化'],['sexual_attraction_direction','性吸引方向','男性','双 / 泛','女性'],['sexual_attraction_intensity','性吸引强度','低','中间','高'],['libido','性欲望强度','低欲望','普通','高欲望'],['romantic_tendency','浪漫倾向','无浪漫','感兴趣','浪漫倾向高'],['relationship_structure','关系结构','单偶','开放','多偶']];const specialLabels={agender:'无性',bigender:'双性',genderfluid:'流动'};const fmt=v=>Number(v).toFixed(3);let rows='<div class="axis-compare"><div class="axis-compare-row axis-compare-head"><b>光谱</b><span>自我定位</span><span>题目画像</span><span>差值</span></div>';defs.forEach(d=>{const key=d[0],c=scores.self_test_comparison[key];const selfText=key==='gender_identity'&&selfAxes.gender_identity_special?(specialLabels[selfAxes.gender_identity_special]||selfAxes.gender_identity_special):fmt(c.self);const gapText=c.gap===null?'—':fmt(c.gap);rows+='<div class="axis-compare-row"><b>'+d[1]+'</b><span>'+selfText+'</span><span>'+fmt(c.test)+'</span><span>Δ '+gapText+'</span></div>';});rows+='</div>';
const fun=(()=>{let tag='光谱漫游者';if(selfAxes.gender_identity_special==='agender')tag='无重力小行星';else if(selfAxes.gender_identity_special==='genderfluid')tag='流光变色龙';else if(selfAxes.gender_identity_special==='bigender')tag='双轨小星球';else if(axes01.sexual_attraction_intensity<.25&&axes01.romantic_tendency>.62)tag='柏拉图棉花糖';else if(axes01.gender_expression>.68&&axes01.libido<.55)tag='软糯小蓝莓';else if(axes01.gender_expression<.32&&scores.initiative>62)tag='酷酷推进器';else if(Math.abs(axes01.sexual_attraction_direction-.5)<.12&&axes01.sexual_attraction_intensity>.58)tag='全向雷达站';else if(axes01.romantic_tendency>.78)tag='浪漫信号塔';else if(axes01.relationship_structure>.72)tag='多线宇航员';else if(axes01.relationship_structure<.28&&axes01.romantic_tendency>.55)tag='单线长跑选手';const chips=[];chips.push(axes01.sexual_attraction_direction<.35?'男性吸引偏强':axes01.sexual_attraction_direction>.65?'女性吸引偏强':'双向雷达');chips.push(axes01.sexual_attraction_intensity<.3?'低吸引频段':axes01.sexual_attraction_intensity>.7?'吸引信号强':'吸引中频');chips.push(axes01.romantic_tendency<.3?'低浪漫频道':axes01.romantic_tendency>.7?'浪漫浓度高':'恋爱随缘区');chips.push(axes01.relationship_structure<.3?'单线偏好':axes01.relationship_structure>.7?'多线友好':'开放区间');if(scores.autonomy>=70)chips.push('边界感清晰');if(scores.initiative>=70)chips.push('行动派');let flag='linear-gradient(180deg,#e40303 0 16%,#ff8c00 16% 32%,#ffed00 32% 48%,#008026 48% 64%,#004dff 64% 80%,#750787 80% 100%)';if(selfAxes.gender_identity_special==='agender')flag='linear-gradient(180deg,#111 0 20%,#aaa 20% 40%,#fff 40% 60%,#b9f480 60% 80%,#111 80% 100%)';else if(selfAxes.gender_identity_special==='genderfluid')flag='linear-gradient(180deg,#ff76a4 0 20%,#fff 20% 40%,#c011d7 40% 60%,#111 60% 80%,#2f3cff 80% 100%)';else if(selfAxes.gender_identity_special==='bigender')flag='linear-gradient(180deg,#f7a8c4 0 28%,#d7a9e3 28% 58%,#7da1f7 58% 100%)';else if(axes01.sexual_attraction_intensity<.25)flag='linear-gradient(180deg,#111 0 25%,#9b9b9b 25% 50%,#fff 50% 75%,#800080 75% 100%)';else if(axes01.romantic_tendency<.25)flag='linear-gradient(180deg,#3da542 0 20%,#a8d47a 20% 40%,#fff 40% 60%,#aaa 60% 80%,#111 80% 100%)';else if(Math.abs(axes01.sexual_attraction_direction-.5)<.16)flag='linear-gradient(180deg,#d60270 0 40%,#9b4f96 40% 62%,#0038a8 62% 100%)';else if(axes01.sexual_attraction_direction>.65)flag='linear-gradient(180deg,#d52d00 0 20%,#ef7627 20% 40%,#fff 40% 60%,#d162a4 60% 80%,#a30262 80% 100%)';else flag='linear-gradient(180deg,#078d70 0 20%,#26ceaa 20% 40%,#98e8c1 40% 55%,#fff 55% 68%,#7bade2 68% 84%,#3d1a78 84% 100%)';return{tag,chips,flag};})();scores.fun_tag=fun.tag;scores.fun_chips=fun.chips;
$('#funTag').textContent=fun.tag;$('#funChips').replaceChildren(...fun.chips.map(text=>{const span=document.createElement('span');span.className='fun-chip';span.textContent=text;return span;}));$('#result').style.setProperty('--flag-bg',fun.flag);$('#resultTitle').textContent='自我定位 × 题目画像';const qualityClass=quality.score>=80?'good':quality.score>=60?'mid':'low';$('#analysis').innerHTML='<div class="result-block"><b>两种视角放在一起看</b><p>第一页自我定位不参与计分；这里把它和混合题型得到的 0–1 画像并排展示。差值只是两种测量方式的位置差异。</p>'+rows+'</div><div class="result-block"><b>作答质量提示</b><p class="quality '+qualityClass+'">'+quality.score+'/100。注意力检查 '+quality.attention_passed+'/'+quality.attention_total+'，语义平行题一致度 '+quality.pair_score+'/100，平均 '+quality.ms_per_item+' ms/题。</p></div>';
$('#bars').replaceChildren();defs.forEach(d=>{const value=axes01[d[0]];const row=document.createElement('div');row.className='barrow';row.innerHTML='<span>'+d[1]+'</span><span><span class="bartrack"><span style="width:'+(value*100)+'%"></span></span><span class="axis-result-labels"><span>'+d[2]+'</span><span>'+d[3]+'</span><span>'+d[4]+'</span></span></span><b>'+fmt(value)+'</b>';$('#bars').appendChild(row);});show('result');try{await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:'3.5.0',nickname:state.nickname,age:state.age,selfGender:state.selfGender,selfOrientation:state.selfOrientation,selfLikert:state.selfLikert,location:state.location,gender:state.assignGender,tag:fun.tag,scores,timestamp:Date.now()})});}catch(e){console.error('Archive Failed',e);}}
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
function validV35Scores(scores) {
  if (scores._schema !== V35_SCHEMA || scores._scoring !== 'unweighted-subscale-means' || scores._question_format !== QUESTION_FORMAT) return false;
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

async function saveV35(request, env, data) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 256000) return json({ error: 'payload too large' }, 413);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'JSON object required' }, 400);
  const nickname = text(data.nickname, 80);
  const age = Number(data.age);
  const assignGender = data.gender === 'AMAB' || data.gender === 'AFAB' ? data.gender : '';
  if (!nickname || !Number.isInteger(age) || age < 13 || age > 90 || !assignGender) return json({ error: 'invalid assessment metadata' }, 400);
  const scores = parseObject(data.scores);
  if (!validV35Scores(scores)) return json({ error: 'questionnaire schema/version mismatch' }, 400);
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
    console.error('mf01sm.v35-d1-save', error);
  }
  try {
    await env.mf01sm.put(id, JSON.stringify({ ...data, version: VERSION, nickname, age, gender: assignGender, location, ip, d1_synced: false, timestamp }));
    return json({ success: true, d1: false, kv: true, version: VERSION });
  } catch (error) {
    console.error('mf01sm.v35-kv-save', error);
    return json({ error: 'archive unavailable' }, 503);
  }
}

function stripV34Enhancer(html) {
  return html.replace(/<script id="mf01sm-v34-spectrum-js">[\s\S]*?<\/script>/g, '');
}
function replaceQuestions(html) {
  const start = html.indexOf('const QUESTIONS=');
  const end = start >= 0 ? html.indexOf(';const LABELS=', start) : -1;
  if (start < 0 || end <= start) return html;
  return html.slice(0, start) + `const QUESTIONS=${JSON.stringify(QUESTIONS_V35)}` + html.slice(end);
}
function replaceRenderer(html) {
  const start = html.indexOf('function render(){');
  const end = start >= 0 ? html.indexOf('function clamp(', start) : -1;
  if (start < 0 || end <= start) return html;
  return html.slice(0, start) + RENDER_V35 + html.slice(end);
}
function replaceFinish(html) {
  const start = html.indexOf('async function finish(){');
  const end = start >= 0 ? html.indexOf('</script>', start) : -1;
  if (start < 0 || end <= start) return html;
  return html.slice(0, start) + FINISH_V35 + html.slice(end);
}
function replaceSection(html, id, replacement, nextNeedle) {
  const start = html.indexOf(`<section id="${id}"`);
  const end = start >= 0 ? html.indexOf(nextNeedle, start) : -1;
  if (start < 0 || end <= start) return html;
  return html.slice(0, start) + replacement + html.slice(end);
}
function patchMain(html) {
  html = stripV34Enhancer(html).replaceAll('3.4.0', VERSION);
  html = replaceSection(html, 'baseline', BASELINE_SECTION_V35, '<section id="quiz"');
  const resultStart = html.indexOf('<section id="result"');
  const resultMarker = resultStart >= 0 ? html.indexOf('</section></main><script>', resultStart) : -1;
  if (resultStart >= 0 && resultMarker > resultStart) html = html.slice(0, resultStart) + RESULT_SECTION_V35 + html.slice(resultMarker + '</section>'.length);
  html = replaceQuestions(html);
  html = replaceRenderer(html);
  html = replaceFinish(html);
  html = html.replace('</head>', `${V35_CSS}</head>`).replace('</body>', `${V35_BASELINE_JS}</body>`);
  return html;
}
function patchAdmin(html) {
  const marker = "let scoreText;if(String(item.version||'').startsWith('3.4')){";
  const branch = "let scoreText;if(String(item.version||'').startsWith('3.5')){const ax=sc.axes01||{};const f=v=>Number.isFinite(Number(v))?Number(v).toFixed(3):'-';scoreText='G:'+f(ax.gender_identity)+' 表:'+f(ax.gender_expression)+' 吸向:'+f(ax.sexual_attraction_direction)+' 性吸:'+f(ax.sexual_attraction_intensity)+' 欲:'+f(ax.libido)+' 浪:'+f(ax.romantic_tendency)+' 单多:'+f(ax.relationship_structure)+' | 质量:'+Math.round(sc.response_quality||0)+' 注:'+Math.round((sc.response_quality_detail||{}).attention_passed||0)+'/'+Math.round((sc.response_quality_detail||{}).attention_total||0)+' 平行:'+Math.round((sc.response_quality_detail||{}).pair_score||0)+' 速:'+Math.round((sc.response_quality_detail||{}).ms_per_item||0)+'ms/题';}else if(String(item.version||'').startsWith('3.4')){";
  return html.replace(marker, branch);
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/api/save' && request.method === 'POST') {
    let data;
    try { data = await request.clone().json(); }
    catch { return json({ error: 'invalid JSON' }, 400); }
    if (text(data?.version, 24) === VERSION) return saveV35(request, env, data);
    return v34Runtime.fetch(request, env, ctx);
  }
  const response = await v34Runtime.fetch(request, env, ctx);
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
