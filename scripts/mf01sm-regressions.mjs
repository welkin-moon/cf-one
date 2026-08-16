import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const moduleUrl = pathToFileURL(path.join(root, 'apps/mf01sm/src/v35-runtime.js')).href;
const worker = (await import(moduleUrl)).default;
const response = await worker.fetch(new Request('https://mf01sm.internal/'), {}, {});
assert.equal(response.status, 200, 'mf01sm root must render');
const html = await response.text();

assert.match(html, /mf01sm[^<]*v3\.5\.0|v3\.5\.0/, 'rendered page must advertise v3.5.0');
assert.ok(html.includes('性吸引方向'), 'baseline must use target-based sexual-attraction direction');
assert.ok(html.includes('<span>男性</span><span>双 / 泛</span><span>女性</span>'), 'attraction direction must be men ↔ bi/pan ↔ women');
assert.ok(html.includes('这一页不会参与测试计分'), 'baseline must disclose statistics-only status');
assert.ok(html.includes('返回 Test 首页 · 更多测试'), 'result must link back to Test directory');
assert.ok(html.includes('funTag') && html.includes('funChips'), 'result must include playful tag presentation');
assert.ok(html.includes('mf01sm-v35-fun-ux'), 'v3.5 playful result/question styling must be injected');
assert.ok(html.includes('mf01sm-v35-spectrum-js'), 'v3.5 continuous baseline controller must be injected');
assert.ok(!html.includes('mf01sm-v34-spectrum-js'), 'obsolete v3.4 baseline controller must be removed');

const baselineStart = html.indexOf('<section id="baseline"');
const quizStart = html.indexOf('<section id="quiz"', baselineStart);
assert.ok(baselineStart >= 0 && quizStart > baselineStart, 'baseline/quiz sections must exist');
const baseline = html.slice(baselineStart, quizStart);
assert.equal((baseline.match(/class="spectrum-range"/g) || []).length, 7, 'baseline must contain exactly seven continuous spectra');
assert.equal((baseline.match(/step="0\.001"/g) || []).length, 7, 'all baseline spectra must use 0.001 steps');
assert.equal((baseline.match(/data-special=/g) || []).length, 3, 'gender identity must keep three mutually-exclusive axis-outside states');
assert.ok(!baseline.includes('data-axis="sexual_orientation"'), 'respondent-relative orientation axis must not remain');
assert.ok(!baseline.includes('其他自我描述'), 'free-text identity field must stay removed');
assert.ok(!baseline.includes('Genderqueer') && !baseline.includes('Questioning') && !baseline.includes('Trans'), 'old identity-tag grid must stay removed');

const questionMatch = html.match(/const QUESTIONS=([\s\S]*?);const LABELS=/);
assert.ok(questionMatch, 'rendered page must expose the questionnaire JSON');
const questions = JSON.parse(questionMatch[1]);
const expectedIds = [
  'ga1','rm1','init1','gc1','rf1','aut1','nb1','pm1','ga2','pf1','gc2','check1',
  'rm2','nb2','rf2','init2','ga3','aut2','gc3','pm2','rf3','nb3','pf2','rm3',
  'pm3','init3','check2','ga4','pf3','aut3','gc4','nb4','init4','aut4',
  'em1','ef1','rn1','pn1','lib1','rd1','ro1','em2','ef2','rn2','pn2','lib2',
  'rd2','ro2','em3','ef3','rn3','pn3','lib3','rd3','ro3','lib4','rd4','ro4',
  'mp1','mp2','mp3','mp4'
];
assert.equal(questions.length, 62, 'v3.5 must have 62 responses');
assert.equal(new Set(questions.map(q => q.id)).size, 62, 'question IDs must be unique');
assert.deepEqual([...questions.map(q => q.id)].sort(), [...expectedIds].sort(), 'v3.5 must preserve the complete 62-ID schema');
assert.deepEqual(questions.filter(q => q.attention).map(q => q.attention), [4, 2], 'attention checks must retain expected response values');
for (const q of questions) {
  assert.ok(['cards','frequency','comfort','likelihood','vibe','desire','intensity','slider'].includes(q.type), `unsupported question type for ${q.id}`);
  if (q.options) assert.equal(q.options.length, 5, `${q.id} custom card set must have five ordered options`);
  if (q.type === 'slider') assert.equal(q.anchors?.length, 3, `${q.id} slider must expose three anchor labels`);
}
assert.ok(new Set(questions.map(q => q.type)).size >= 7, 'questionnaire should genuinely mix several response formats');
const pairs = new Map();
for (const q of questions) if (q.pair) pairs.set(q.pair, [...(pairs.get(q.pair) || []), q.id]);
assert.equal(pairs.size, 17, 'v3.5 should retain 17 semantic parallel pairs');
for (const [pair, ids] of pairs) assert.equal(ids.length, 2, `parallel pair ${pair} must contain exactly two items`);

console.log(`mf01sm v3.5 regressions passed: ${questions.length} responses, ${new Set(questions.map(q => q.type)).size} response formats, ${pairs.size} semantic pairs.`);
