import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  V4_VERSION,V4_SCHEMA,V4_QUESTION_FORMAT,V4_QUESTIONS,V4_SCORE_KEYS,V4_RADAR_AXES,
  LOCKED_TAG_VOCABULARY,scoreV4Answers,classifyV4Result
} from '../apps/mf01sm/src/v4-model.js';
import { MAIN_HTML, ADMIN_HTML } from '../apps/mf01sm/src/current-pages.generated.js';
import current from '../apps/mf01sm/src/current-runtime.js';

assert.equal(V4_VERSION, '4.0.4');
assert.equal(V4_SCHEMA, 'mf01sm-v4-independent-leaf');
assert.equal(V4_QUESTION_FORMAT, 'mixed-v4-stable-reuse');
assert.equal(V4_QUESTIONS.length, 58, 'v4 keeps the 58-response footprint');
assert.equal(new Set(V4_QUESTIONS.map(q=>q.id)).size, 58, 'question IDs must be unique');
assert.equal(new Set(V4_QUESTIONS.map(q=>q.reuse)).size, 58, 'reuse keys must be unique');
assert.equal(V4_QUESTIONS.filter(q=>q.attention).length, 2, 'v4 retains two attention checks');
assert.equal(V4_QUESTIONS.filter(q=>!q.attention).length, 56, 'v4 has 56 substantive items');

const counts = Object.fromEntries(V4_SCORE_KEYS.map(key=>[key,V4_QUESTIONS.filter(q=>q.key===key).length]));
assert.deepEqual(counts, {
  gender_aligned:3,gender_cross:3,nonbinary_identity:3,gender_style_masc:7,gender_style_fem:7,aesthetic:7,
  role0:5,role1:5,s_like:3,m_like:3,attr_m:2,attr_f:2,sexual_expression:2,romantic_tendency:2,mono:1,poly:1
});
const sensitiveKeys = new Set(['attr_m','attr_f','sexual_expression','romantic_tendency','mono','poly','s_like','m_like']);
assert.equal(V4_QUESTIONS.filter(q=>sensitiveKeys.has(q.key)).length, 16, 'sex/romance/relationship/S-M footprint must stay at 16/56 substantive items');

const nb = V4_QUESTSTIONS = undefined;
