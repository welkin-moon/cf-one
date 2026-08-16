import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const moduleUrl = pathToFileURL(path.join(root, 'apps/mf01sm/src/v37-runtime.js')).href;
const worker = (await import(moduleUrl)).default;
const response = await worker.fetch(new Request('https://mf01sm.internal/'), {}, {});
assert.equal(response.status, 200, 'mf01sm root must render');
const html = await response.text();

assert.match(html, /mf01sm[^<]*v3\.7\.0|v3\.7\.0/, 'rendered page must advertise v3.7.0');
assert.ok(html.includes('性吸引方向'), 'baseline must keep target-based attraction direction');
assert.ok(html.includes('<span>男性</span><span>双 / 泛</span><span>女性</span>'), 'attraction direction must remain men ↔ bi/pan ↔ women');
assert.ok(html.includes('这一页不会参与测试计分'), 'baseline must disclose statistics-only status');
assert.ok(html.includes('返回 Test 首页 · 更多测试'), 'result must link back to Test directory');
assert.ok(html.includes('funTag') && html.includes('funChips'), 'result must keep playful tag presentation');
assert.ok(html.includes('男子气 ↔ 女子气'), 'result must expose the nonsexual masculinity/femininity style axis');
assert.ok(html.includes('0 ↔ 1 主被动'), 'result must expose the initiative 0/1 axis');
assert.ok(html.includes('跟随 ↔ 主导'), 'result must expose the nonsexual interpersonal dominance axis');
assert.ok(html.includes('S-like 假想') && html.includes('M-like 假想'), 'result must expose separate S-like and M-like hypothetical scores');
assert.ok(html.includes('年龄门槛：16+'), 'intro must explain the 16+ gate');
assert.ok(html.includes('mf01sm-v37-age-gate'), 'client must include the v3.7 age gate');
assert.ok(html.includes('q.reverse?6-raw:raw'), 'rendered scoring must honor reverse-keyed questions');
assert.ok(html.includes('assigned-sex-v3.7-balanced-sm-fantasy'), 'rendered result must use the v3.7 schema');
assert.ok(html.includes('mixed-v37-sm-fantasy'), 'rendered result must use the v3.7 question format');

const introStart = html.indexOf('<section id="intro"');
const baselineStart = html.indexOf('<section id="baseline"');
assert.ok(introStart >= 0 && baselineStart > introStart, 'intro/baseline sections must exist');
const intro = html.slice(introStart, baselineStart);
assert.match(intro, /id="age"[^>]*min="16"[^>]*max="90"/, 'age input must enforce 16–90');
assert.ok(intro.includes('16–90'), 'age placeholder must show 16–90');

const quizStart = html.indexOf('<section id="quiz"', baselineStart);
assert.ok(quizStart > baselineStart, 'baseline/quiz sections must exist');
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
  'dom5','aut5','ms7','fs7','sl1','ml1','sl2','ml2','sl3','ml3'
];
assert.equal(questions.length, 58, 'v3.7 must have 56 substantive items plus two attention checks');
assert.equal(new Set(questions.map(q => q.id)).size, 58, 'question IDs must be unique');
assert.deepEqual([...questions.map(q => q.id)].sort(), [...expectedIds].sort(), 'v3.7 must preserve its complete versioned item schema');
assert.deepEqual(questions.filter(q => q.attention).map(q => q.attention), [4, 2], 'attention checks must retain expected response values');
for (const q of questions) {
  assert.ok(['cards','frequency','comfort','likelihood','vibe','desire','intensity','slider'].includes(q.type), `unsupported question type for ${q.id}`);
  if (q.options) assert.equal(q.options.length, 5, `${q.id} custom card set must have five ordered options`);
  if (q.type === 'slider') assert.equal(q.anchors?.length, 3, `${q.id} slider must expose three anchor labels`);
}
assert.ok(new Set(questions.map(q => q.type)).size >= 7, 'questionnaire should keep several response formats');

const sexRelated = new Set(['rom_m','rom_f','rom_nb','phys_m','phys_f','phys_nb','libido','romantic_desire','relationship_openness']);
const sexualCount = questions.filter(q => sexRelated.has(q.key)).length;
assert.equal(sexualCount, 12, 'v3.7 must keep the v3.6 sexuality/romance/relationship footprint at 12 items');
assert.equal(questions.filter(q => q.key === 'gender_style_masc' || q.key === 'gender_style_fem').length, 14, 'v3.7 must retain 14 nonsexual gender-coded style items');
assert.equal(questions.filter(q => q.key === 'initiative' || q.key === 'dominance' || q.key === 'autonomy').length, 15, 'v3.7 must retain 15 nonsexual interpersonal-role items');

const smItems = questions.filter(q => q.key === 's_like' || q.key === 'm_like');
assert.equal(smItems.length, 6, 'v3.7 must add six hypothetical S/M-like items');
assert.equal(smItems.filter(q => q.key === 's_like').length, 3, 'S-like must contain three items');
assert.equal(smItems.filter(q => q.key === 'm_like').length, 3, 'M-like must contain three items');
for (const q of smItems) {
  assert.match(q.text, /假想|虚构|游戏/, `${q.id} must be explicitly hypothetical or role-play framed`);
  assert.match(q.text, /随时|边界|双方|同意/, `${q.id} must make consent/boundary framing explicit`);
  assert.doesNotMatch(q.text, /性交|性行为|裸体|生殖器|性器官|阴茎|阴道|乳房/, `${q.id} must remain non-explicit`);
}

const mmpiInspired = questions.filter(q => q.inspiration === 'MMPI-Mf-domain-paraphrase');
assert.equal(mmpiInspired.length, 9, 'v3.7 should retain nine explicitly marked MMPI-Mf-domain paraphrases');
const inspiredText = mmpiInspired.map(q => q.text).join('\n');
assert.match(inspiredText, /机械|工程|自然科学/, 'MMPI-inspired domains should include technical/mechanical interest');
assert.match(inspiredText, /诗歌|人物关系|情绪氛围/, 'MMPI-inspired domains should include literary/affective interest');
assert.match(inspiredText, /花店|植物|园艺/, 'MMPI-inspired domains should include plant/gardening interest');
assert.match(inspiredText, /饭|甜点/, 'MMPI-inspired domains should include cooking/hosting interest');
assert.match(inspiredText, /戏剧|舞台|唱歌/, 'MMPI-inspired domains should include performance/drama interest');
assert.match(inspiredText, /日记|照片|票根/, 'MMPI-inspired domains should include autobiographical keepsake/journaling interest');

const pairs = new Map();
for (const q of questions) if (q.pair) pairs.set(q.pair, [...(pairs.get(q.pair) || []), q.id]);
assert.equal(pairs.size, 13, 'v3.7 should have thirteen focused semantic parallel pairs after adding S-like and M-like pairs');
for (const [pair, ids] of pairs) assert.equal(ids.length, 2, `parallel pair ${pair} must contain exactly two items`);
assert.equal(questions.filter(q => q.reverse).length, 2, 'v3.7 should retain exactly two deliberate reverse-keyed items');

console.log(`mf01sm v3.7 regressions passed: ${questions.length} responses, age 16+, ${sexualCount}/56 sexuality-related, ${smItems.length} hypothetical S/M-like items, ${mmpiInspired.length} MMPI-Mf-domain paraphrases, ${pairs.size} semantic pairs.`);
