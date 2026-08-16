import v36Runtime from './v36-runtime.js';

const SCORE_AXIS_V36 = String.raw`function scoreAxis(key){const vals=QUESTIONS.map((q,i)=>{if(q.key!==key)return null;const raw=state.answers[i];if(raw===null)return null;return q.reverse?6-raw:raw;}).filter(v=>v!==null);if(!vals.length)return 0;const mean=vals.reduce((a,b)=>a+b,0)/vals.length;return Math.round((mean-1)/4*100);}`;

// Domain inspiration only. The MMPI-CHN source itself notes that MMPI item text may remain
// copyrighted by the University of Minnesota / Pearson. Keep our wording original and do not
// copy MMPI item text or claim MMPI norms/validity.
const MMPI_MF_INSPIRED = {
  ms2: {
    text: '桌上有个坏掉的小设备，而旁边也有现成替代品。你会有多想先研究结构、找故障点，看看能不能亲手修明白？',
    type: 'intensity'
  },
  ms3: {
    text: '刷到一段讲机械结构、工程原理或自然科学现象的内容时，你通常会有多想继续看懂它为什么这样工作？',
    type: 'intensity'
  },
  ms4: {
    text: '如果周末有一个户外搭建、修缮、测量或动手完成实体项目的活动，你被它吸引的程度？',
    type: 'intensity'
  },
  ms5: {
    text: '挑一个会长期使用的东西时，“结构可靠、功能清楚、耐用好维护”这些特征对你的吸引力有多强？',
    type: 'intensity'
  },
  fs2: {
    text: '如果空下来随便挑点东西读，诗歌、细腻的故事、人物关系或带明显情绪氛围的文字对你的吸引力有多强？',
    type: 'intensity'
  },
  fs3: {
    text: '路过花店、植物店或园艺区时，你会不会因为花、叶片、配色或把植物养好的过程而想停下来看看？',
    type: 'frequency'
  },
  fs4: {
    text: '如果要为朋友准备一顿饭、甜点或一小桌吃的，你会有多享受挑味道、摆放和照顾大家体验的过程？',
    type: 'intensity'
  },
  fs5: {
    text: '戏剧、舞台表演、唱歌或把情绪通过表演表达出来，这类活动本身对你的吸引力有多强？',
    type: 'intensity'
  },
  fs6: {
    text: '你有多喜欢用日记、照片、票根、小卡片之类留下生活片段，过一阵再回头看它们？',
    type: 'intensity'
  }
};

function patchQuestions(html) {
  const start = html.indexOf('const QUESTIONS=');
  const end = start >= 0 ? html.indexOf(';const LABELS=', start) : -1;
  if (start < 0 || end <= start) return html;
  let questions;
  try { questions = JSON.parse(html.slice(start + 'const QUESTIONS='.length, end)); }
  catch { return html; }
  questions = questions.map(question => {
    const patch = MMPI_MF_INSPIRED[question.id];
    return patch ? { ...question, ...patch, options: undefined, anchors: undefined, inspiration: 'MMPI-Mf-domain-paraphrase' } : question;
  });
  return html.slice(0, start) + `const QUESTIONS=${JSON.stringify(questions)}` + html.slice(end);
}

function patchScoring(html) {
  const start = html.indexOf('function scoreAxis(key){');
  const end = start >= 0 ? html.indexOf('function longestRun(', start) : -1;
  if (start < 0 || end <= start) return html;
  return html.slice(0, start) + SCORE_AXIS_V36 + html.slice(end);
}

export default {
  async fetch(request, env, ctx) {
    const response = await v36Runtime.fetch(request, env, ctx);
    if (request.method !== 'GET') return response;
    const url = new URL(request.url);
    const type = response.headers.get('content-type') || '';
    if (url.pathname !== '/' || !type.includes('text/html')) return response;
    let body = await response.text();
    body = patchQuestions(body);
    body = patchScoring(body);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  }
};
