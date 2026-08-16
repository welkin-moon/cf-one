import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const moduleUrl = pathToFileURL(path.join(root, 'apps/mf01sm/src/v36-entry.js')).href;
const worker = (await import(moduleUrl)).default;
const response = await worker.fetch(new Request('https://mf01sm.internal/'), {}, {});
assert.equal(response.status, 200, 'mf01sm root must render');
const html = await response.text();

assert.match(html, /mf01sm[^<]*v3\.6\.0|v3\.6\.0/, 'rendered page must advertise v3.6.0');
assert.ok(html.includes('性吸引方向'), 'baseline must keep target-based attraction direction');
assert.ok(html.includes('<span>男性</span><span>双 / 泛</span><span>女性</span>'), 'attraction direction must remain men ↔ bi/pan ↔ women');
assert.ok(html.includes('这一页不会参与测试计分'), 'baseline must disclose statistics-only status');
assert.ok(html.includes('返回 Test 首页 · 更多测试'), 'result must link back to Test directory');
assert.ok(html.includes('funTag') && html.includes('funChips'), 'result must keep playful tag presentation');
assert.ok(html.includes('男子气 ↔ 女子气'), 'result must expose the nonsexual masculinity/femininity style axis');
assert.ok(html.includes('0 ↔ 1 主被动'), 'result must expose the initiative 0/1 axis');
assert.ok(html.includes('跟随 ↔ 主导'), 'result must expose the nonsexual interpersonal dominance axis');
assert.ok(html.includes('非性人格 / 风格维度'), 'result must explain the nonsexual personality layer');
assert.ok(html.includes('q.reverse?6-raw:raw'), 'rendered scoring must honor reverse-keyed questions');

const baselineStart = html.indexOf('<section id="baseline"');
const quizStart = html.indexOf('<section id="quiz"', baselineStart);
assert.ok(baselineStart >= 0 && quizStart > baselineStart, 'baseline/quiz sections must exist');
const baseline = html.slice(baselineStart, quizStart);
assert.equal((baseline.match(/class="spectrum-range"/g) || []).length, 7, 'baseline must contain exactly seven statistics-only continuous spectra');
assert.equal((baseline.match(/step="0\.001"/g) || []).length, 7, 'all baseline spectra must use 0.001 steps');
assert.equal((baseline.match(/data-special=/g) || []).length, 3, 'gender identity must keep three mutually-exclusive axis-outside states');
assert.ok(!baseline.includes('data-axis="sexual_orientation"'), 'respondent-relative orientation axis must not return');
assert.ok(!baseline.includes('其他自我描述'), 'free-text identity field must stay removed');

const questionMatch = html.match(/const QUESTIONS=([\s\S]*?);const LABELS=/);
assert.ok(questionMatch, 'rendered page must expose the questionnaire JSON');
const questions = JSON.parse(questionMatch[1]);
const expectedIds = [
  'ga1','ms1','init1','gc1','fs1','aut1','nb1','dom1','rm1','rf1','rn1','check1',
  'ms2','fs2','ga2','init2','pm1','pf1','pn1','dom2','nb2','aut2','lib1','rd1',
  'ms3','fs3','gc2','init3','ro1','dom3','ga3','fs4','ms4','aut3','check2','nb3',
  'gc3','ms5','fs5','init4','lib2','rd2','dom4','aut4','ms6','fs6','ro2','init5',
  'dom5','aut5','ms7','fs7'
];
assert.equal(questions.length, 52, 'v3.6 must have 50 substantive items plus two attention checks');
assert.equal(new Set(questions.map(q => q.id)).size, 52, 'question IDs must be unique');
assert.deepEqual([...questions.map(q => q.id)].sort(), [...expectedIds].sort(), 'v3.6 must preserve its complete versioned item schema');
assert.deepEqual(questions.filter(q => q.attention).map(q => q.attention), [4, 2], 'attention checks must retain expected response values');
for (const q of questions) {
  assert.ok(['cards','frequency','comfort','likelihood','vibe','desire','intensity','slider'].includes(q.type), `unsupported question type for ${q.id}`);
  if (q.options) assert.equal(q.options.length, 5, `${q.id} custom card set must have five ordered options`);
  if (q.type === 'slider') assert.equal(q.anchors?.length, 3, `${q.id} slider must expose three anchor labels`);
}
assert.ok(new Set(questions.map(q => q.type)).size >= 7, 'questionnaire should keep several response formats');

const sexRelated = new Set(['rom_m','rom_f','rom_nb','phys_m','phys_f','phys_nb','libido','romantic_desire','relationship_openness']);
const sexualCount = questions.filter(q => sexRelated.has(q.key)).length;
assert.equal(sexualCount, 12, 'v3.6 sexuality/romance/relationship items should be reduced to 12 of 50 substantive items');
assert.equal(questions.filter(q => q.key === 'gender_style_masc' || q.key === 'gender_style_fem').length, 14, 'v3.6 must contain 14 nonsexual gender-coded style items');
assert.equal(questions.filter(q => q.key === 'initiative' || q.key === 'dominance' || q.key === 'autonomy').length, 15, 'v3.6 must contain 15 nonsexual interpersonal-role items');
assert.ok(questions.filter(q => q.key === 'gender_style_masc' || q.key === 'gender_style_fem').every(q => !/性吸引|性欲|恋爱|伴侣|出生指派性别/.test(q.text)), 'gender-coded style items must not depend on sex/romance/self-ID wording');

const pairs = new Map();
for (const q of questions) if (q.pair) pairs.set(q.pair, [...(pairs.get(q.pair) || []), q.id]);
assert.equal(pairs.size, 11, 'v3.6 should retain eleven focused semantic parallel pairs');
for (const [pair, ids] of pairs) assert.equal(ids.length, 2, `parallel pair ${pair} must contain exactly two items`);
assert.equal(questions.filter(q => q.reverse).length, 2, 'v3.6 should include exactly two deliberate reverse-keyed items');

console.log(`mf01sm v3.6 regressions passed: ${questions.length} responses, ${sexualCount}/50 sexuality-related, 14 gender-style, 15 interpersonal, ${pairs.size} semantic pairs.`);
