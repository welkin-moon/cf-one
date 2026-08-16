import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import legacyRuntime from '../apps/mf01sm/src/v37-runtime.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const outputPath = path.join(rootDirectory, 'apps/mf01sm/src/current-pages.generated.js');
const VERSION = '3.8.1';

async function render(pathname) {
  const response = await legacyRuntime.fetch(new Request(`https://mf01sm.build${pathname}`), {}, {});
  if (response.status !== 200) throw new Error(`Failed to render ${pathname}: HTTP ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) throw new Error(`Failed to render ${pathname}: expected HTML, got ${type}`);
  return response.text();
}

const FUN_BLOCK = String.raw`/* mf01sm-v381-roast-tags */const fun=(()=>{const a=axes01;const seed=Math.round(scores.gender_style_masc*3+scores.gender_style_fem*5+scores.initiative*7+scores.dominance*11+scores.autonomy*13+scores.s_like*17+scores.m_like*19+scores.romantic_desire*23+scores.libido*29);const pick=(arr,off=0)=>arr[Math.abs(seed+off)%arr.length];let left='光谱野生样本';if(scores.gender_style_masc>=70&&scores.gender_style_fem>=70)left=pick(['刻板印象双持怪','性别风格双核CPU','男气女气都不肯下线']);else if(scores.gender_style_masc-scores.gender_style_fem>=18)left=pick(['扳手系生物','硬核参数怪','功能优先型人类']);else if(scores.gender_style_fem-scores.gender_style_masc>=18)left=pick(['高灵敏软体雷达','细节捕手成精','情绪传感器超频']);else if(a.sexual_attraction_intensity>=.68&&a.romantic_tendency<.42)left=pick(['身体先上线','吸引模块满格','雷达很忙但恋爱不急']);else if(a.romantic_tendency>=.72&&a.sexual_attraction_intensity<.4)left=pick(['纯爱CPU','浪漫脑内存常驻','恋爱剧情党']);else if(Math.abs(a.sexual_attraction_direction-.5)<=.14&&a.sexual_attraction_intensity>.55)left=pick(['全向目标锁定器','审美没有防火墙','双向雷达满功率']);else if(scores.nonbinary>=72)left=pick(['二元表格拒绝服务','性别坐标越界样本','分类器看了想辞职']);else if(a.libido>.75&&a.romantic_tendency<.45)left=pick(['引擎热导航冷','欲望线程单独运行','恋爱服务器维护中']);else left=pick(['光谱野生样本','人类参数调试版','统计学不想解释的人']);let right='灵活切换 / 均衡平权';if(scores.s_like>=72&&scores.m_like>=72)right=pick(['灵活切换 / 双向受力测试机','S/M双开 / 两边都别闲着','横竖都能玩 / 压力测试全家桶'],11);else if(scores.m_like>=75&&scores.autonomy>=65)right=pick(['M倾向 / 遥控器借你但产权归我','主动投降派 / 撤回键焊死在手里','M值超标 / 但别替我做人生决定'],13);else if(scores.s_like>=75&&scores.dominance>=65)right=pick(['诱导掌控 / 腹黑施工队','微笑控场 / 安全范围内爱搞事','S倾向 / 规则大概率是你写的'],17);else if(scores.m_like>=72&&scores.dominance<=38)right=pick(['被动接受者 / 压力测试爱好者','M倾向 / 你带路我保留停止键','顺从体验卡 / 仅限约定场景'],19);else if(scores.m_like>=72)right=pick(['M倾向 / 压力测试爱好者','被为难体验卡 / 自愿领取','吃点可控的苦 / 居然觉得有节目效果'],23);else if(scores.s_like>=72)right=pick(['S倾向 / 安全范围内爱搞事','诱导掌控 / 傲娇反差','小坏心眼 / 规则内施工'],29);else if(scores.initiative>=75&&scores.dominance>=70)right=pick(['绝对支配 / 人形项目经理','强势主导 / 谁都别想摸鱼','主动引导者 / 顺便把流程也定了'],31);else if(scores.initiative<=35&&scores.dominance<=35)right=pick(['被动接受者 / 等人来捞','副驾驶常驻 / 请给明确路线','你们先决定 / 我负责点头'],37);else if(scores.dominance>=75)right=pick(['绝对支配 / 强势主导','控场倾向 / 方向盘焊手上了','舰桥总指挥 / 默认自己主持'],41);else if(scores.autonomy>=75)right=pick(['边界钛合金 / 别替我做主','自主权重过高 / 建议可以决定不行','最终解释权 / 坚持本人持有'],43);else if(scores.initiative>=72)right=pick(['主动引导者 / 冷场不存在的','先手小怪物 / 事情总得有人开','推进癖 / 模糊计划看着难受'],47);else if(scores.initiative<42)right=pick(['被动接受者 / 看情况再启动','等一个先手 / 然后正常接管','回应型选手 / 不抢开场麦'],53);const tag=left+' · '+right;const chips=[];chips.push('男气 '+scores.gender_style_masc+' / 女气 '+scores.gender_style_fem);chips.push(a.initiative01>.68?'先手偏多':a.initiative01<.32?'等先手':'先后手都行');chips.push(a.dominance>.68?'方向盘爱好者':a.dominance<.32?'副驾驶舒适区':'协商控场');chips.push(a.autonomy>.68?'决定权别乱摸':a.autonomy<.32?'比较能交托':'自主可商量');if(scores.s_like>=60||scores.m_like>=60)chips.push('S '+scores.s_like+' / M '+scores.m_like);if(a.sexual_attraction_intensity>=.65&&a.romantic_tendency<.45)chips.push('身体先上线');else if(a.romantic_tendency>=.72)chips.push('恋爱脑线程活跃');else if(Math.abs(a.sexual_attraction_direction-.5)<.14)chips.push('双向雷达');let flag='linear-gradient(135deg,#5bcefa,#f5a9b8,#fff,#b7a4ff,#5bcefa)';if(scores.gender_style_masc>=70&&scores.gender_style_fem>=70)flag='linear-gradient(135deg,#4f6fff,#c9b6ff,#fff,#ffb0d7,#ff668f)';else if(scores.gender_style_fem-scores.gender_style_masc>=18)flag='linear-gradient(135deg,#ff7eb6,#ffd4e8,#fff,#d8c4ff,#8ac7ff)';else if(scores.gender_style_masc-scores.gender_style_fem>=18)flag='linear-gradient(135deg,#4a70d8,#85b6ff,#fff,#b7e3d4,#4f8f7d)';else if(scores.s_like>=72&&scores.m_like>=72)flag='linear-gradient(135deg,#191919,#7d3cff,#ef75b8,#f6d365,#191919)';else if(scores.dominance>=70)flag='linear-gradient(135deg,#552583,#a66dd4,#f3d8ff,#547bd1)';return{tag,chips,flag};})();scores.fun_tag=fun.tag;scores.fun_chips=fun.chips;`;

function patchMain(source) {
  let html = source;

  // v3.8.1 is presentation/admin-only. The v3.7 measurement schema and every questionnaire item stay unchanged.
  html = html.replaceAll('3.7.0', VERSION);
  html = html.replaceAll('v3.7 ', 'v3.8.1 ');
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

// v3.8.1 is a presentation/admin revision: questionnaire content must remain byte-for-byte equivalent as data.
const beforeQuestions = parseQuestions(legacyMain);
const afterQuestions = parseQuestions(mainHtml);
if (JSON.stringify(beforeQuestions) !== JSON.stringify(afterQuestions)) {
  throw new Error('v3.8.1 page generation changed questionnaire content; refusing to generate.');
}
if (afterQuestions.length !== 58) throw new Error(`Expected 58 v3.7/v3.8 responses, found ${afterQuestions.length}.`);
if (!mainHtml.includes('v3.8.1') || !mainHtml.includes('mf01sm-v38-age-gate')) throw new Error('v3.8.1 page markers are missing.');
if (!mainHtml.includes('mf01sm-v381-roast-tags') || !mainHtml.includes('绝对支配 / 强势主导') || !mainHtml.includes('诱导掌控 / 傲娇反差')) throw new Error('v3.8.1 roast-tag layer is incomplete.');
if (!/id="age"[^>]*min="13"[^>]*max="99"/.test(mainHtml)) throw new Error('Generated age input is not 13–99.');
if (!mainHtml.includes('13–99')) throw new Error('Generated age description does not expose 13–99.');
if (/n\s*<\s*16|age\s*<\s*16|n\s*>\s*90|age\s*>\s*90/.test(mainHtml)) throw new Error('A legacy 16/90 client age gate survived v3.8.1 generation.');

const generated = `// Generated by scripts/generate-mf01sm-current.mjs. Do not edit by hand.\nexport const MAIN_HTML = ${JSON.stringify(mainHtml)};\nexport const ADMIN_HTML = ${JSON.stringify(adminHtml)};\n`;
await writeFile(outputPath, generated, 'utf8');
console.log(`Generated mf01sm ${VERSION} static pages from the unchanged v3.7 measurement snapshot (${afterQuestions.length} responses; roast tags + complete admin details only).`);
