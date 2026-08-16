import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import legacyRuntime from '../apps/mf01sm/src/v37-runtime.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const outputPath = path.join(rootDirectory, 'apps/mf01sm/src/current-pages.generated.js');
const VERSION = '3.8.2';

async function render(pathname) {
  const response = await legacyRuntime.fetch(new Request(`https://mf01sm.build${pathname}`), {}, {});
  if (response.status !== 200) throw new Error(`Failed to render ${pathname}: HTTP ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) throw new Error(`Failed to render ${pathname}: expected HTML, got ${type}`);
  return response.text();
}

const FUN_BLOCK = String.raw`/* mf01sm-v382-v1-roast-tags */const fun=(()=>{
const a=axes01;
const amab=state.assignGender==='AMAB';
const age=Number(document.getElementById('age')?.value||0);
const smEligible=age>=16;
const selfAxes=(scores._self_report&&scores._self_report.axes)||{};
const comparison=scores.self_test_comparison||{};
const attM=Number(scores.attr_m||0),attF=Number(scores.attr_f||0);
const panish=attM>=52&&attF>=52&&Math.abs(attM-attF)<=18&&a.sexual_attraction_intensity>=.30;
const aceish=Number(scores.ace||0)>=78&&a.sexual_attraction_intensity<=.28;
const cross=scores.gender_cross>=64&&scores.gender_cross-scores.gender_aligned>=14;
const agender=scores.nonbinary>=76&&scores.nonbinary>=Math.max(scores.gender_aligned,scores.gender_cross)+8;
let left;
if(agender)left='第四性 / 电子盆栽';
else if(cross&&amab){
  if(attM>=attF+18)left='软糯小蓝梁 / 蓝梁诱捕器';
  else left='里百合 / 药娘预备役 / 软糯伪娘';
}else if(cross&&!amab){
  if(attF>=attM+18)left='铁T / 姬圈老保';
  else left='√-16先锋 / 腐改跨';
}else if(aceish)left='纯爱战神 / 戒断圣体';
else if(panish)left='杂食恶犬 / 荤素不忌';
else if(amab&&attM>=50&&attM>=attF+18)left='击剑爱好者 / 哇是成都人';
else if(!amab&&attF>=50&&attF>=attM+18)left='柑橘味香女 / 兰州特产';
else if(amab&&attF>=attM)left='平平无奇顺直男';
else if(!amab&&attM>=attF)left='普通顺直女';
else if(amab)left='击剑爱好者 / 哇是成都人';
else left='柑橘味香女 / 兰州特产';

const i=Number(scores.initiative||0),d=Number(scores.dominance||0),sl=Number(scores.s_like||0),ml=Number(scores.m_like||0);
const active=i>=72,passive=i<=28;
const highS=sl>=74&&d>=58;
const highM=ml>=74&&d<=42;
const microActiveM=i>=56&&i<72&&ml>=56&&ml<74&&d<=48;
const microPassiveS=i>28&&i<=44&&sl>=56&&sl<74&&d>=52;
const pureActive=i>=68&&sl<58&&ml<58;
const purePassive=i<=32&&sl<58&&ml<58;
const allMid=[i,d,sl,ml].every(v=>Math.abs(v-50)<=12);
const chaotic=(sl>=70&&ml>=70)||(Math.max(i,d,sl,ml)-Math.min(i,d,sl,ml)>=55);
let right;
if(smEligible&&active&&highS)right='爹系狂攻 / 强制爱暴君 / 掌控狂';
else if(smEligible&&passive&&highM)right='绝赞绒布球 / 惹人怜爱的M圣体 / 专属抱枕';
else if(smEligible&&active&&highM)right='提款机忠犬 / 奉献型败犬 / 苦主圣体';
else if(smEligible&&passive&&highS)right='钓系绿茶 / 腹黑榨汁机 / 女王受';
else if(microActiveM)right='纸老虎 / 窝里横';
else if(microPassiveS)right='又菜又爱玩 / 嘴强王者';
else if(pureActive)right='无情推土机 / 钝角';
else if(purePassive)right='躺平咸鱼 / 纯粹承伤体';
else if(allMid)right='端水大师 / 薛定谔的XP';
else if(chaotic)right='究极缝合怪';
else if(i>=62)right='无情推土机 / 钝角';
else if(i<=38)right='躺平咸鱼 / 纯粹承伤体';
else right='端水大师 / 薛定谔的XP';

const tag=left+' · '+right;
const chips=[];
chips.push(cross?'跨指派倾向明显':agender?'非二元适配高':'性别方向较混合');
chips.push(panish?'双向吸引':aceish?'低吸引频段':attM>=attF+18?'偏男吸引':attF>=attM+18?'偏女吸引':'吸引方向混合');
chips.push(i>=68?'先手偏多':i<=32?'等先手':'先后手都行');
chips.push(d>=68?'控场偏强':d<=32?'更爱跟随':'协商控场');
chips.push(scores.autonomy>=68?'自主边界强':scores.autonomy<=32?'比较能交托':'自主可商量');
if(smEligible&&(sl>=65||ml>=65))chips.push('戏剧控场 '+scores.s_like+' / 戏剧交托 '+scores.m_like);

let roastSelf='';
const selfGenderNumeric=typeof selfAxes.gender_identity==='number'&&Number.isFinite(selfAxes.gender_identity);
const selfLooksAssigned=selfGenderNumeric&&(amab?selfAxes.gender_identity<=.35:selfAxes.gender_identity>=.65);
const meanGap=Number(comparison.mean_absolute_gap);
const genderGap=Number((comparison.gender_identity||{}).gap);
const directionGap=Number((comparison.sexual_attraction_direction||{}).gap);
const intensityGap=Number((comparison.sexual_attraction_intensity||{}).gap);
if(cross&&selfLooksAssigned&&Number.isFinite(genderGap)&&genderGap>=.24){
  roastSelf='第一页还在努力把自己塞回出生指派那一格，后面的题已经把门拆了。顺向分没守住，跨向分一路越狱，前台简介和后台画像像两个互相拉黑的账号。查水表结论：嘴确实比分数硬；这不是身份判决书，但“默认皮肤已经开始掉漆”这件事很难继续装没看见。';
}else if(agender&&selfGenderNumeric&&Number.isFinite(genderGap)&&genderGap>=.22){
  roastSelf='第一页还想老老实实站进二元格子，题目端却把格子当成了建议而不是规定。你这套性别画像像拿鞋盒装液体猫：硬塞也能塞，松手马上又流出去。查水表结论：不是系统不会分类，是你本人对“只能二选一”这件事配合度实在有限。';
}else if(panish&&((Number.isFinite(directionGap)&&directionGap>=.24)||(Number.isFinite(intensityGap)&&intensityGap>=.28))){
  roastSelf='第一页把自己包装成单线运营，后面两边吸引分一起亮灯。不是海王鉴定书，是你的雷达压根没老实按性别分区。查水表结论：菜单看得比嘴上承认的宽；以后再说“我应该只吃这一口”，记得先和自己的答题记录串好口供。';
}else if(aceish&&Number.isFinite(intensityGap)&&intensityGap>=.24){
  roastSelf='第一页给吸引力频道开得挺响，题目端却集体进入省电模式。红尘在门口狂按铃，你的系统提示只有“稍后提醒”。查水表结论：浪漫、亲密和身体吸引本来就不是同一个旋钮，别为了剧情完整硬给自己补一条并不存在的高频信号。';
}else if(Number.isFinite(meanGap)&&meanGap<=.14){
  roastSelf='你这人最没节目效果的地方：第一页和后面题居然基本对得上。系统翻半天账本也没抓到大型翻车现场，前台怎么写，后台大致就怎么跑。老实人一枚，建议去隔壁相亲角领号，别继续占用本测试的瓜田带宽。';
}else if(Number.isFinite(meanGap)&&meanGap>=.30){
  roastSelf='第一页和后面题像两个没见过面的版本：大方向还能勉强认亲，细节已经开始互相举报。你对自己的描述更像公开简介，题目端则像不小心外泄的草稿箱。查水表结论：不是谁真谁假，而是你对自己“以为会怎样”和“实际怎么选”之间，确实隔着一条不小的沟。';
}else{
  roastSelf='没抓到史诗级翻车，但也不是完全一比一复刻。第一页像你给自己的角色简介，后面题像实际跑起来后的实机录像：主线差不多，边角处还是会露出几处“原来我会这么选”的小事故。属于轻微打脸，暂不执行公开处刑。';
}

let roastXp='';
if(smEligible&&active&&highS){
  roastXp='你不是在参与互动，你是想接管导演席。先手要抢、节奏要控、规则最好也由你来写，别人还在犹豫，你脑内已经开完三次作战会议。这个“强制爱暴君”帽子主要是在损你那条站得笔直的控场欲；虚构剧情里可以当最终 Boss，现实互动里记得别把队友一起写进你的剧本。';
}else if(smEligible&&passive&&highM){
  roastXp='你的人设像一颗自带“请安排我”按钮的绒布球：先手能不抢就不抢，控制权递得比外卖还快，压力剧情反而容易让你进入角色。白给归白给，娱乐结果可以躺平，现实里的边界和重要决定别顺手也一起打包寄出去。';
}else if(smEligible&&passive&&highS){
  roastXp='这是最邪门的象限之一：本人不一定先动，场子倒想先归你管。表面像坐在观众席，实际上每个人怎么演你心里都有分镜；自己不抢麦，但特别会让别人顺着你的节奏走。“腹黑榨汁机”扣得这么响，纯粹因为你的低先手和高控场组合太有节目效果。';
}else if(smEligible&&active&&highM){
  roastXp='你是那种冲锋号自己吹、任务自己扛，干完还会回头确认“这样行不行”的忠犬型怪东西。行动力冲在前排，决定权却不怎么恋战，越忙越容易把方向盘递给别人。“提款机忠犬”是在损这种出力积极、控制权随缘的反差，现实里别真把自己活成无限续杯服务。';
}else if(microActiveM){
  roastXp='纸老虎本虎：第一步你敢迈，真到了“到底听谁的”又容易开始随缘。外壳有点冲，内核没有想象中那么硬；典型的先龇牙两秒，再自己把遥控器递出去。你不是没主见，只是主见经常在关键时刻突然请年假。';
}else if(microPassiveS){
  roastXp='你最大的本事是本人没怎么动，意见已经铺满全场。行动上偏等别人开局，精神上又忍不住点评路线；属于手柄不拿，嘴里已经完成三周目攻略。“又菜又爱玩 / 嘴强王者”不是冤枉，是你的先手分和控场分真的在互相拆台。';
}else if(pureActive||(!smEligible&&i>=62)){
  roastXp='别人还在“要不再想想”，你已经把第一步踩出去了。你未必爱控制别人，但非常讨厌事情卡在原地，属于没有王位也要自己推剧情的类型。“无情推土机”不是说你没感情，是你对“别磨叽，先动起来”这件事有一点近乎宗教般的执着。';
}else if(purePassive||(!smEligible&&i<=38)){
  roastXp='你不是没想法，你只是把开场权长期外包。别人不动，你就陪着世界一起待机；别人一招手，你又能正常跟上。“纯粹承伤体”的核心不是弱，是最好先给你一个明确入口，不然你真能在开场动画里坐到片尾曲。';
}else if(smEligible&&aceish){
  roastXp='你的雷达对身体吸引这条频道基本处于省电模式。浪漫、亲密、喜欢一个人都可以另算，但“见到符合偏好的人就自动拉满信号”显然不是你的主线任务。红尘天天给你发推送，你稳定点“稍后提醒”；纯爱战神这顶帽子至少比硬装热血番主角合身。';
}else if(chaotic){
  roastXp='这张雷达图不是画像，是几个亚文化社团抢一块宣传栏留下的施工现场。主动、主导、S/M-like 几条线互相打架，哪一派都想说你是自己人，结果谁都没法完整领走。“究极缝合怪”不是诊断，是系统已经懒得继续给你找单一物种名了。';
}else if(allMid||right==='端水大师 / 薛定谔的XP'){
  roastXp='恭喜，你成功把大部分旋钮拧在“看情况”。谁想从这张图里抄到一个干脆结论，谁就会先疯。端水大师不是单纯中庸，而是你真的很会根据对象和场景换挡；优点叫适配力，缺点叫别人问你“所以你到底想怎样”时，你有概率把对方一起逼到看破红尘。';
}else if(i>=62){
  roastXp='你整体还是明显偏先手：不一定非要当老大，但很难长期忍受剧情没人推进。别人负责犹豫，你负责把下一页翻过去。说好听点是行动派，说难听点就是你和“再等等看”这五个字有私人恩怨。';
}else if(i<=38){
  roastXp='你整体偏回应型：先观察、等信号、确认场面安全，再决定要不要往前走。别人眼里可能像慢半拍，其实你只是拒绝替全世界承担开场动画。真有人把路铺出来以后，你通常也没那么难带。';
}else{
  roastXp='你的互动底色没有哪条轴夸张到能单独称王：能主动，也会等人；能控场，也接受协商。听起来非常健康，作为娱乐测试却多少有点扫兴。系统只能给出一句欠揍总结：此人配置正常，暂未发现值得拉警报的隐藏 Boss。';
}

let flag='linear-gradient(135deg,#5bcefa,#f5a9b8,#fff,#b7a4ff,#5bcefa)';
if(agender)flag='linear-gradient(135deg,#111,#666,#fff,#8c63ff,#f5df4d)';
else if(cross)flag='linear-gradient(135deg,#5bcefa,#f5a9b8,#fff,#f5a9b8,#5bcefa)';
else if(panish)flag='linear-gradient(135deg,#d60270,#9b4f96,#0038a8)';
else if(aceish)flag='linear-gradient(135deg,#000,#a3a3a3,#fff,#800080)';
else if(d>=72)flag='linear-gradient(135deg,#552583,#a66dd4,#f3d8ff,#547bd1)';
return{tag,chips,flag,roastSelf,roastXp};})();scores.fun_tag=fun.tag;scores.fun_chips=fun.chips;`;

function patchMain(source) {
  let html = source;

  // v3.8.2 is presentation/admin-only. The v3.7 measurement schema and every questionnaire item stay unchanged.
  html = html.replaceAll('3.7.0', VERSION);
  html = html.replaceAll('v3.7 ', 'v3.8.2 ');
  html = html.replaceAll('mf01sm-v37-age-gate', 'mf01sm-v38-age-gate');

  // One client-side age range: 13–99. The v3.8 server deliberately does not enforce age range.
  html = html.replaceAll("age.min='16'", "age.min='13'");
  html = html.replaceAll("age.max='90'", "age.max='99'");
  html = html.replaceAll("age.placeholder='16–90'", "age.placeholder='13–99'");
  html = html.replaceAll('n<16||n>90', 'n<13||n>99');
  html = html.replaceAll('n < 16 || n > 90', 'n < 13 || n > 99');
  html = html.replaceAll('age>90', 'age>99');
  html = html.replaceAll('age > 90', 'age > 99');
  html = html.replaceAll('min="16" max="90"', 'min="13" max="99"');
  html = html.replaceAll('placeholder="16–90"', 'placeholder="13–99"');
  html = html.replaceAll('16–90', '13–99');
  html = html.replaceAll('13–90', '13–99');
  html = html.replaceAll('16 岁及以上', '13 岁及以上');
  html = html.replaceAll('年龄门槛：16+', '年龄范围：13–99');
  html = html.replaceAll('16+', '13+');

  const funPattern = /const fun=\(\(\)=>\{[\s\S]*?\}\)\(\);scores\.fun_tag=fun\.tag;scores\.fun_chips=fun\.chips;/;
  if (!funPattern.test(html)) throw new Error('Could not locate the legacy entertainment-tag block.');
  html = html.replace(funPattern, FUN_BLOCK);
  const analysisMarker = "+personality+interaction+sm+'</div><div class=\"result-block\"><b>第一页自评 ↔ 题目画像</b>";
  const roastAnalysis = "+personality+interaction+sm+'</div><div class=\"result-block\"><b>结果页“打脸”解析</b><p><b>【表里不一鉴定】</b> '+fun.roastSelf+'</p><p><b>【XP底色解剖】</b> '+fun.roastXp+'</p></div><div class=\"result-block\"><b>第一页自评 ↔ 题目画像</b>";
  if (!html.includes(analysisMarker)) throw new Error('Could not locate the result analysis insertion point.');
  html = html.replace(analysisMarker, roastAnalysis);
  html = html.replace('它们不是现实行为判断。', '它们不是现实行为判断；上方娱乐 tag 和“打脸”正文可以很嘴欠，但不是诊断、身份判定或现实同意。');

  return html;
}

function patchAdmin(source) {
  let html = source.replaceAll('3.7.0', VERSION);
  html = html.replace(
    "if(String(item.version||'').startsWith('3.7')){",
    "if(String(item.version||'').startsWith('3.8')||String(item.version||'').startsWith('3.7')){"
  );
  html = html.replace(
    '.hidden{display:none}</style>',
    '.hidden{display:none}.record-details{margin-top:8px}.record-details summary{cursor:pointer;color:#d0bcff;font-weight:700}.record-details pre{max-width:760px;max-height:520px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#17151b;border:1px solid #39363d;border-radius:12px;padding:12px;color:#ded7e2}.kv-toggle{display:flex;align-items:center;gap:8px;margin-top:12px;color:#bdb5c2;font-size:12px}.kv-toggle input{padding:0;width:auto;min-height:0;accent-color:#d0bcff}</style>'
  );
  html = html.replace(
    '<button id="go">Access</button><p id="msg"></p>',
    '<button id="go">Access</button><label class="kv-toggle"><input id="includeKv" type="checkbox">包含 KV 历史 / 回退数据（额外读取；1.x 在这里）</label><p id="msg"></p>'
  );
  html = html.replace(
    "fetch('/api/admin/data?pwd='+encodeURIComponent(pwd))",
    "fetch('/api/admin/data?pwd='+encodeURIComponent(pwd)+(document.getElementById('includeKv')?.checked?'&include_kv=1':''))"
  );
  html = html.replace(
    'values.forEach((v,i)=>{const td=document.createElement(\'td\');td.textContent=esc(v);if(i===9)td.className=\'tag\';tr.appendChild(td);});body.appendChild(tr);});',
    'values.forEach((v,i)=>{const td=document.createElement(\'td\');td.textContent=esc(v);if(i===9)td.className=\'tag\';tr.appendChild(td);});const details=document.createElement(\'details\');details.className=\'record-details\';const summary=document.createElement(\'summary\');summary.textContent=\'完整记录 / Raw\';const pre=document.createElement(\'pre\');pre.textContent=\'展开后加载…\';let loaded=false;details.addEventListener(\'toggle\',()=>{if(details.open&&!loaded){pre.textContent=JSON.stringify(item,null,2);loaded=true;}});details.append(summary,pre);if(tr.children[10])tr.children[10].appendChild(details);body.appendChild(tr);});'
  );
  html = html.replace('历史版本继续原样保留。v3.1 起把浪漫吸引与身体/性吸引分开；Ver 列直接来自每条记录的 version。', '历史版本继续原样保留。Scores 列保留紧凑摘要；展开“完整记录 / Raw”可查看该条记录返回的全部字段，包括所有原始子量表、axes01、第一页自评、self↔test 差值、response_quality_detail、raw answers、schema/question format 与娱乐 tag/chips。');
  if (!html.includes('完整记录 / Raw')) throw new Error('Admin full-record details control was not injected.');
  if (!html.includes('includeKv') || !html.includes('include_kv=1')) throw new Error('Admin optional KV-history control was not injected.');
  return html;
}

function parseQuestions(html) {
  const match = html.match(/const QUESTIONS=([\s\S]*?);const LABELS=/);
  if (!match) throw new Error('Rendered questionnaire JSON was not found.');
  return JSON.parse(match[1]);
}

const legacyMain = await render('/');
const legacyAdmin = await render('/admin');
const mainHtml = patchMain(legacyMain);
const adminHtml = patchAdmin(legacyAdmin);

// v3.8.2 is a presentation/admin revision: questionnaire content must remain byte-for-byte equivalent as data.
const beforeQuestions = parseQuestions(legacyMain);
const afterQuestions = parseQuestions(mainHtml);
if (JSON.stringify(beforeQuestions) !== JSON.stringify(afterQuestions)) {
  throw new Error('v3.8.2 page generation changed questionnaire content; refusing to generate.');
}
if (afterQuestions.length !== 58) throw new Error(`Expected 58 v3.7/v3.8 responses, found ${afterQuestions.length}.`);
if (!mainHtml.includes('v3.8.2') || !mainHtml.includes('mf01sm-v38-age-gate')) throw new Error('v3.8.2 page markers are missing.');
if (!mainHtml.includes('mf01sm-v382-v1-roast-tags') || !mainHtml.includes('里百合 / 药娘预备役 / 软糯伪娘') || !mainHtml.includes('爹系狂攻 / 强制爱暴君 / 掌控狂') || !mainHtml.includes('端水大师 / 薛定谔的XP') || !mainHtml.includes('结果页“打脸”解析')) throw new Error('v3.8.2 v1-style entertainment-tag layer is incomplete.');
if (mainHtml.includes('里百合风味 / 裙摆叛逃者') || mainHtml.includes('爹系暴君 / 控场狂魔')) throw new Error('An assistant-authored v3.8.2 tag survived the locked user vocabulary.');
if (!mainHtml.includes('【表里不一鉴定】') || !mainHtml.includes('【XP底色解剖】')) throw new Error('Polished roast-analysis headings are missing.');
if (!/id="age"[^>]*min="13"[^>]*max="99"/.test(mainHtml)) throw new Error('Generated age input is not 13–99.');
if (!mainHtml.includes('13–99')) throw new Error('Generated age description does not expose 13–99.');
if (/n\s*<\s*16|age\s*<\s*16|n\s*>\s*90|age\s*>\s*90/.test(mainHtml)) throw new Error('A legacy 16/90 client age gate survived v3.8.2 generation.');

const generated = `// Generated by scripts/generate-mf01sm-current.mjs. Do not edit by hand.\
export const MAIN_HTML = ${JSON.stringify(mainHtml)};\
export const ADMIN_HTML = ${JSON.stringify(adminHtml)};\
`;
await writeFile(outputPath, generated, 'utf8');
console.log(`Generated mf01sm ${VERSION} static pages from the unchanged v3.7 measurement snapshot (${afterQuestions.length} responses; locked v1-style roast tags + polished roast analysis + complete admin details only).`);
