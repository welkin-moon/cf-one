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
const seed=Math.round(scores.gender_style_masc*3+scores.gender_style_fem*5+scores.initiative*7+scores.dominance*11+scores.autonomy*13+scores.s_like*17+scores.m_like*19+scores.romantic_desire*23+scores.libido*29);
const pick=(arr,off=0)=>arr[Math.abs(seed+off)%arr.length];
const amab=state.assignGender==='AMAB';
const attM=Number(scores.attr_m||0),attF=Number(scores.attr_f||0);
const panish=attM>=55&&attF>=55&&Math.abs(attM-attF)<=18;
const aceish=a.sexual_attraction_intensity<=.28||scores.ace>=72;
const cross=scores.gender_cross>=62&&scores.gender_cross-scores.gender_aligned>=16;
const nb=scores.nonbinary>=70&&scores.nonbinary>=Math.max(scores.gender_aligned,scores.gender_cross)+5;
let left='取向薛定谔 / 光谱游民';
if(nb)left=pick(['第四性 / 电子盆栽','无相切换体 / 二元系统拒绝访问','性别流体史莱姆 / 暂无固定形态']);
else if(cross&&amab){
  if(panish||attF>=attM+12)left=pick(['里百合风味 / 裙摆叛逃者','跨向姬圈 / 二次元女主候补','里百合 / 软糯反差体']);
  else if(attM>=attF+12)left=pick(['软糯小蓝梁 / 男生单推','跨向直女风味 / 蓝梁捕获器','反差系小蓝梁 / 男生雷达满格']);
  else left=pick(['跨向漂流体 / 性别流动','反差变身系 / 阵营未定','跨指派高浓度 / 光谱乱逛']);
}else if(cross&&!amab){
  if(panish||attM>=attF+12)left=pick(['√-16先锋 / 跨向少年感','跨向男仔 / 腐向雷达','反差硬派 / 少年漫住民']);
  else if(attF>=attM+12)left=pick(['铁T风味 / 姬圈硬派','跨向姬圈 / 铁血短发怪','姬圈硬派 / 反差少年感']);
  else left=pick(['跨向漂流体 / 性别流动','反差变身系 / 阵营未定','跨指派高浓度 / 光谱乱逛']);
}else if(aceish)left=pick(['纯爱战神 / 柏拉图待机','清心寡欲圣体 / 感情线慢热','低吸引隐藏角色 / 恋爱随缘']);
else if(panish)left=pick(['全向捕获体 / 荤素不忌','杂食系生物 / 双向开图','全阵营友好 / 光谱漫游者']);
else if(amab&&attM>=attF+16)left=pick(['彩虹男生单推 / 男生雷达满格','男生单推人 / 彩虹侧写','男向专注型 / 单线雷达']);
else if(!amab&&attF>=attM+16)left=pick(['柑橘味姬圈 / 百合单推人','姬圈雷达满格 / 柑橘系住民','女向专注型 / 百合单线']);
else if(amab&&attF>=attM+16)left=pick(['平平无奇顺直男','异性向常规款 / 无隐藏剧情','顺直男标准皮肤']);
else if(!amab&&attM>=attF+16)left=pick(['普通顺直女','异性向常规款 / 无隐藏剧情','顺直女标准皮肤']);
else left=pick(['取向薛定谔 / 光谱游民','光谱乱逛 / 暂无固定阵营','自由游走体 / 阵营加载中']);

const i=scores.initiative,d=scores.dominance,aut=scores.autonomy;
let right='端水大师 / 薛定谔的XP';
if(scores.s_like>=80&&scores.m_like>=80)right=pick(['双向戏剧体 / 左右横跳','混沌双修 / 两边都能演','高压剧情全都要 / 反差成精'],7);
else if(scores.s_like>=80&&d>=65)right=pick(['高压剧情党 / 控场魔王','危险气场 / 规则大概率你来写','小恶魔控场 / 笑着加难度'],11);
else if(scores.m_like>=80&&d<=35)right=pick(['受压剧情党 / 绒布球圣体','绝赞绒布球 / 白给小动物','软体承压怪 / 一推就开始演'],13);
else if(i>=72&&d>=72)right=pick(['爹系暴君 / 控场狂魔','强势开荒 / 规则我来写','霸道领队 / 全员跟上'],17);
else if(i<=28&&d<=28)right=pick(['绝赞绒布球 / 白给小动物','专属抱枕 / 等人来捞','被动软体 / 轻轻一推就走'],19);
else if(i>=72&&d<=28)right=pick(['奉献型忠犬 / 冲锋在前听指挥','行动派忠犬 / 干完活再点头','高行动低话语权 / 忙着忙着就交托了'],23);
else if(i<=28&&d>=72)right=pick(['钓系控场怪 / 躺着当军师','腹黑操盘手 / 本人拒绝先手','嘴强王者 / 等别人递话筒'],29);
else if(i>=72)right=pick(['无情推土机 / 钝角','先手小霸王 / 冷场克星','行动派 / 计划必须往前走'],31);
else if(i<=28)right=pick(['躺平咸鱼 / 纯粹承伤体','回应型生物 / 谁先开口谁负责','被动待机 / 叫到才启动'],37);
else if(d>=72)right=pick(['精神总指挥 / 手不一定动','控场怪 / 方向盘焊死','女王式调度 / 先看你们表演'],41);
else if(d<=28)right=pick(['纸老虎 / 窝里横','跟随型刺客 / 嘴上不服','温顺外壳 / 偶尔炸毛'],43);
else if(Math.abs(i-50)<=12&&Math.abs(d-50)<=12)right=pick(['端水大师 / 薛定谔的XP','混沌缝合怪 / 什么都有一点','自由游走体 / 暂无固定站位'],47);
else if(aut>=75)right=pick(['边界感满格 / 谁都别替我按确认','自主权钉死 / 建议可以决定不行','最终解释权 / 本人永久持有'],53);

const tag=left+' · '+right;
const chips=[];
chips.push(cross?'跨指派倾向明显':nb?'非二元适配高':'性别方向较混合');
chips.push(panish?'双向吸引':aceish?'低吸引频段':attM>=attF+16?'偏男吸引':attF>=attM+16?'偏女吸引':'吸引方向混合');
chips.push(i>=68?'先手偏多':i<=32?'等先手':'先后手都行');
chips.push(d>=68?'控场偏强':d<=32?'更爱跟随':'协商控场');
chips.push(aut>=68?'自主边界强':aut<=32?'比较能交托':'自主可商量');
if(scores.s_like>=65||scores.m_like>=65)chips.push('戏剧控场 '+scores.s_like+' / 戏剧交托 '+scores.m_like);
let flag='linear-gradient(135deg,#5bcefa,#f5a9b8,#fff,#b7a4ff,#5bcefa)';
if(nb)flag='linear-gradient(135deg,#111,#666,#fff,#8c63ff,#f5df4d)';
else if(cross&&amab)flag='linear-gradient(135deg,#5bcefa,#f5a9b8,#fff,#f5a9b8,#5bcefa)';
else if(cross&&!amab)flag='linear-gradient(135deg,#5bcefa,#f5a9b8,#fff,#f5a9b8,#5bcefa)';
else if(panish)flag='linear-gradient(135deg,#d60270,#9b4f96,#0038a8)';
else if(aceish)flag='linear-gradient(135deg,#000,#a3a3a3,#fff,#800080)';
else if(d>=72)flag='linear-gradient(135deg,#552583,#a66dd4,#f3d8ff,#547bd1)';
return{tag,chips,flag};})();scores.fun_tag=fun.tag;scores.fun_chips=fun.chips;`;

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
  html = html.replace('它们不是现实行为判断。', '它们不是现实行为判断；上方娱乐 tag 可以很嘴欠，但不是诊断、身份判定或现实同意。');

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
if (!mainHtml.includes('mf01sm-v382-v1-roast-tags') || !mainHtml.includes('里百合风味 / 裙摆叛逃者') || !mainHtml.includes('爹系暴君 / 控场狂魔') || !mainHtml.includes('端水大师 / 薛定谔的XP')) throw new Error('v3.8.2 v1-style entertainment-tag layer is incomplete.');
if (!/id="age"[^>]*min="13"[^>]*max="99"/.test(mainHtml)) throw new Error('Generated age input is not 13–99.');
if (!mainHtml.includes('13–99')) throw new Error('Generated age description does not expose 13–99.');
if (/n\s*<\s*16|age\s*<\s*16|n\s*>\s*90|age\s*>\s*90/.test(mainHtml)) throw new Error('A legacy 16/90 client age gate survived v3.8.2 generation.');

const generated = `// Generated by scripts/generate-mf01sm-current.mjs. Do not edit by hand.\
export const MAIN_HTML = ${JSON.stringify(mainHtml)};\
export const ADMIN_HTML = ${JSON.stringify(adminHtml)};\
`;
await writeFile(outputPath, generated, 'utf8');
console.log(`Generated mf01sm ${VERSION} static pages from the unchanged v3.7 measurement snapshot (${afterQuestions.length} responses; v1-style roast tags + complete admin details only).`);
