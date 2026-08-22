import assert from 'node:assert/strict';
import current from '../apps/mf01sm/src/current-runtime.js';

const response = await current.fetch(new Request('https://mf01sm.internal/'), {});
assert.equal(response.status, 200);
const html = await response.text();

assert.ok(html.includes('v4.0.5'), 'public result page must expose 4.0.5');
assert.ok(!html.includes('v4.0.4'), 'served public page must not retain the 4.0.4 presentation version');
assert.ok(html.includes('viewBox="0 0 460 440"') && html.includes('preserveAspectRatio="xMidYMid meet"'), 'radar must reserve horizontal label margins');
assert.ok(!html.includes('viewBox="0 0 400 400"'), 'old tight radar viewBox must not survive');
assert.ok(html.includes("cx=230,cy=220,r=128") && html.includes('r+38') && html.includes('r+21'), 'radar geometry must keep labels and values inside the padded SVG');
assert.ok(html.includes('safe-area-inset-left') && html.includes('safe-area-inset-right') && html.includes('safe-area-inset-top') && html.includes('safe-area-inset-bottom'), 'notched devices must receive safe-area padding');
assert.ok(html.includes('@media(max-width:760px)') && html.includes('@media(max-width:430px)') && html.includes('(orientation:landscape)'), 'tablet/phone/narrow-phone/landscape breakpoints must be present');
assert.ok(html.includes('grid-template-columns:minmax(76px,1fr) repeat(3,minmax(40px,.58fr))'), 'self-comparison grid must shrink safely on narrow phones');
assert.ok(html.includes('overflow-x:hidden') && html.includes('overflow-wrap:anywhere'), 'long labels/tags must not create page-level horizontal overflow');
assert.ok(html.includes('flag-haze') && html.includes('flag-strip'), 'result background and strip must remain wired to the result flag');
assert.ok(html.includes("id=\"locationRetry\"") && html.includes('mf01sm-v4-history-2') && html.includes('mf01sm-v4-answers-1'), '4.0.3 location gate and 4.0.2+ answer compatibility must survive the presentation patch');

const start = html.indexOf('function classifyV4Result');
const end = html.indexOf('\nconst $=', start);
assert.ok(start >= 0 && end > start, 'browser classifier source must be extractable');
const classify = new Function(`${html.slice(start, end)}; return classifyV4Result;`)();
const base = {
  gender_aligned: 50, gender_cross: 50, nonbinary_identity: 50,
  gender_style_masc: 50, gender_style_fem: 50, aesthetic: 50,
  role0: 50, role1: 50, s_like: 50, m_like: 50,
  attr_m: 50, attr_f: 50, sexual_expression: 50,
  romantic_tendency: 50, mono: 50, poly: 50
};

let result = classify({...base, gender_aligned:85, gender_cross:20, nonbinary_identity:20, attr_m:10, attr_f:85}, {assignGender:'AMAB', age:16});
assert.equal(result.flags.isLgbtqia, false);
assert.equal(result.flagKind, 'cis-male-blue');
assert.equal(result.flag, '#5b9cff', 'non-LGBTQIA+ male result must use a solid blue background');

result = classify({...base, gender_aligned:85, gender_cross:20, nonbinary_identity:20, attr_m:85, attr_f:10}, {assignGender:'AFAB', age:16});
assert.equal(result.flags.isLgbtqia, false);
assert.equal(result.flagKind, 'cis-female-pink');
assert.equal(result.flag, '#ff8fb8', 'non-LGBTQIA+ female result must use a solid pink background');

result = classify({...base, gender_aligned:67, gender_cross:33, nonbinary_identity:58, attr_m:50, attr_f:50}, {assignGender:'AFAB', age:16});
assert.equal(result.flags.isLgbtqia, true);
assert.equal(result.flagKind, 'bi-mixed');
assert.match(result.flag, /#d60270/);

result = classify({...base, gender_aligned:85, gender_cross:20, nonbinary_identity:20, attr_m:85, attr_f:10}, {assignGender:'AMAB', age:16});
assert.equal(result.flags.sameSexAttraction, true);
assert.equal(result.flagKind, 'mlm');
assert.match(result.flag, /#078d70/);

result = classify({...base, gender_aligned:85, gender_cross:20, nonbinary_identity:20, attr_m:10, attr_f:85}, {assignGender:'AFAB', age:16});
assert.equal(result.flags.sameSexAttraction, true);
assert.equal(result.flagKind, 'lesbian');
assert.match(result.flag, /#d52d00/);

result = classify({...base, gender_aligned:20, gender_cross:85, nonbinary_identity:20, attr_m:10, attr_f:85}, {assignGender:'AMAB', age:16});
assert.equal(result.flagKind, 'trans');
assert.match(result.flag, /#5bcefa/);

result = classify({...base, gender_aligned:20, gender_cross:20, nonbinary_identity:90, attr_m:10, attr_f:85}, {assignGender:'AFAB', age:16});
assert.equal(result.flagKind, 'nonbinary');
assert.match(result.flag, /#fff430/);

result = classify({...base, gender_aligned:85, gender_cross:20, nonbinary_identity:20, attr_m:20, attr_f:20}, {assignGender:'AFAB', age:16});
assert.equal(result.flagKind, 'ace');
assert.match(result.flag, /#800080/);

console.log('mf01sm 4.0.5 runtime regressions passed: responsive result geometry, safe areas, solid cis backgrounds, and LGBTQIA+ flag palettes.');
