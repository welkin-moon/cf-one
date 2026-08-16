import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const currentUrl = pathToFileURL(path.join(root, 'apps/mf01sm/src/current-runtime.js')).href;
const legacyUrl = pathToFileURL(path.join(root, 'apps/mf01sm/src/v37-runtime.js')).href;
const current = (await import(currentUrl)).default;
const legacy = (await import(legacyUrl)).default;

const currentResponse = await current.fetch(new Request('https://mf01sm.internal/'), {});
assert.equal(currentResponse.status, 200, 'v3.8.2 root must render');
const html = await currentResponse.text();
assert.match(html, /v3\.8\.2/, 'current page must advertise v3.8.2');
assert.ok(html.includes('mf01sm-v38-age-gate'), 'current page must use the v3.8 client age gate');
assert.ok(!html.includes('mf01sm-v37-age-gate'), 'legacy v3.7 age-gate marker must not survive the snapshot');
assert.ok(html.includes('年龄范围：13–99') || html.includes('13–99'), 'current page must describe the 13–99 range');
assert.ok(/id="age"[^>]*min="13"[^>]*max="99"/.test(html), 'age input must be 13–99');
assert.ok(!/n\s*<\s*16|age\s*<\s*16|n\s*>\s*90|age\s*>\s*90/.test(html), 'legacy 16/90 client validation must be absent');
assert.ok(html.includes('assigned-sex-v3.7-balanced-sm-fantasy'), 'measurement schema must stay v3.7 because questionnaire content is unchanged');
assert.ok(html.includes('mixed-v37-sm-fantasy'), 'question format id must stay v3.7 because questionnaire content is unchanged');
assert.ok(html.includes('S-like 假想') && html.includes('M-like 假想'), 'S/M-like content must remain present');
assert.ok(html.includes('男子气 ↔ 女子气'), 'MMPI-Mf-inspired nonsexual result must remain present');
assert.ok(html.includes('返回 Test 首页 · 更多测试'), 'Test-directory return action must remain present');
assert.ok(html.includes('mf01sm-v382-v1-roast-tags'), 'v3.8.2 must contain the v1-style entertainment-tag generator');
assert.ok(html.includes('里百合风味 / 裙摆叛逃者'), 'v3.8.2 must retain the v1-style cross-assigned AMAB entertainment family');
assert.ok(html.includes('第四性 / 电子盆栽'), 'v3.8.2 must include nonbinary/agender-style entertainment vocabulary');
assert.ok(html.includes('爹系暴君 / 控场狂魔'), 'v3.8.2 must include the high-initiative/high-control roast family');
assert.ok(html.includes('绝赞绒布球 / 白给小动物'), 'v3.8.2 must include the low-initiative/low-control roast family');
assert.ok(html.includes('端水大师 / 薛定谔的XP'), 'v3.8.2 must include the balanced/mixed roast family');
assert.ok(!html.includes('绝对支配 / 人形项目经理'), 'v3.8.1 project-manager roast must be removed');
assert.ok(!html.includes('性别风格双核CPU'), 'v3.8.1 CPU-style tag vocabulary must be removed');

function parseQuestions(source) {
  const match = source.match(/const QUESTIONS=([\s\S]*?);const LABELS=/);
  assert.ok(match, 'rendered page must expose questionnaire JSON');
  return JSON.parse(match[1]);
}

const legacyResponse = await legacy.fetch(new Request('https://mf01sm.legacy/'), {}, {});
const legacyHtml = await legacyResponse.text();
const legacyQuestions = parseQuestions(legacyHtml);
const currentQuestions = parseQuestions(html);
assert.equal(currentQuestions.length, 58, 'v3.8.2 must retain all 58 v3.7 responses');
assert.deepEqual(currentQuestions, legacyQuestions, 'v3.8.2 must not change questionnaire content or response formats');

const adminResponse = await current.fetch(new Request('https://mf01sm.internal/admin'), {});
assert.equal(adminResponse.status, 200, 'v3.8.2 admin page must render without legacy runtime delegation');
const adminHtml = await adminResponse.text();
assert.ok(adminHtml.includes("startsWith('3.8')") && adminHtml.includes("startsWith('3.7')"), 'admin renderer must understand both v3.8 and v3.7 score shapes');
assert.ok(adminHtml.includes('完整记录 / Raw'), 'admin rows must expose a lazy full-record details control');
assert.ok(adminHtml.includes('JSON.stringify(item,null,2)'), 'admin full-record details must contain the complete returned record rather than another summary');
assert.ok(adminHtml.includes('includeKv') && adminHtml.includes('include_kv=1'), 'admin must expose an opt-in KV history/recovery load path instead of scanning KV by default');

let inserted = null;
let kvWrites = 0;
const env = {
  mf01smsql: {
    prepare(sql) {
      assert.match(sql, /INSERT INTO records/, 'normal save path must perform one parameterized D1 insert');
      return {
        bind(...values) {
          inserted = values;
          return { async run() { return { success: true }; } };
        }
      };
    }
  },
  mf01sm: {
    async put() { kvWrites++; }
  }
};

const saveBody = {
  version: '3.8.2',
  nickname: 'regression',
  age: 7,
  gender: 'AMAB',
  selfGender: 'test',
  selfOrientation: '',
  selfLikert: {},
  location: 'Unavailable',
  tag: 'test',
  scores: {},
  timestamp: Date.now()
};
const saveResponse = await current.fetch(new Request('https://mf01sm.internal/api/save', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(saveBody)
}), env);
assert.equal(saveResponse.status, 200, 'server must not reject a response solely because age is outside the UI range');
const saveJson = await saveResponse.json();
assert.equal(saveJson.d1, true, 'normal archive path must use D1');
assert.equal(saveJson.kv, false, 'normal archive path must not mirror to KV');
assert.equal(saveJson.version, '3.8.2');
assert.ok(inserted, 'D1 insert parameters must be captured');
assert.equal(inserted[3], 7, 'server must preserve normalized age without enforcing a range');
assert.equal(kvWrites, 0, 'successful D1 save must consume no KV write');

const oversizedResponse = await current.fetch(new Request('https://mf01sm.internal/api/save', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'content-length': '300000' },
  body: '{}'
}), env);
assert.equal(oversizedResponse.status, 413, 'server must retain payload-size protection against storage abuse');

console.log(`mf01sm v3.8.2 regressions passed: flat static pages, ${currentQuestions.length} unchanged responses, v1-style entertainment tags, complete lazy admin records + opt-in KV history, client age 13–99, one D1 write / zero routine KV writes.`);
