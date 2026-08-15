import expandedRuntime from './expanded-runtime.js';

const EXTRA_IDS = new Set([
  'em1','ef1','rn1','pn1','lib1','rd1','ro1','em2','ef2','rn2','pn2','lib2',
  'rd2','ro2','em3','ef3','rn3','pn3','lib3','rd3','ro3','lib4','rd4','ro4'
]);

function redistributeQuestions(html) {
  const start = html.indexOf('const QUESTIONS=');
  const end = start >= 0 ? html.indexOf(';const LABELS=', start) : -1;
  if (start < 0 || end <= start) return html;
  try {
    const questions = JSON.parse(html.slice(start + 'const QUESTIONS='.length, end));
    const base = questions.filter(question => !EXTRA_IDS.has(question.id));
    const extra = questions.filter(question => EXTRA_IDS.has(question.id));
    if (extra.length !== EXTRA_IDS.size || base.length + extra.length !== questions.length) return html;
    const distributed = [];
    let extraIndex = 0;
    for (let i = 0; i < base.length; i++) {
      distributed.push(base[i]);
      const target = Math.floor(((i + 1) * extra.length) / base.length);
      while (extraIndex < target) distributed.push(extra[extraIndex++]);
    }
    while (extraIndex < extra.length) distributed.push(extra[extraIndex++]);
    return html.slice(0, start) + `const QUESTIONS=${JSON.stringify(distributed)}` + html.slice(end);
  } catch (error) {
    console.error('mf01sm.v32-redistribute', error);
    return html;
  }
}

function polishMain(html) {
  html = html
    .replace('4. 你目前最常使用的浪漫取向身份描述是？', '7. 你目前最常使用的浪漫取向身份描述是？')
    .replace('7. 你的日常性别表达更接近哪里？', '8. 你的日常性别表达更接近哪里？')
    .replace('8. 你自觉整体的身体/性吸引强度如何？', '9. 你自觉整体的身体/性吸引强度如何？')
    .replace('9. 不考虑具体对象时，你自觉自己的性欲 / 性冲动强度如何？', '10. 不考虑具体对象时，你自觉自己的性欲 / 性冲动强度如何？')
    .replace('10. 你对“拥有恋爱关系本身”的向往有多强？', '11. 你对“拥有恋爱关系本身”的向往有多强？')
    .replace('11. 如果只看个人偏好，你更喜欢怎样的关系结构？', '12. 如果只看个人偏好，你更喜欢怎样的关系结构？');
  return redistributeQuestions(html);
}

async function route(request, env, ctx) {
  const response = await expandedRuntime.fetch(request, env, ctx);
  if (request.method !== 'GET') return response;
  const type = response.headers.get('content-type') || '';
  const url = new URL(request.url);
  if (url.pathname !== '/' || !type.includes('text/html')) return response;
  const original = await response.text();
  const body = polishMain(original);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default { fetch(request, env, ctx) { return route(request, env, ctx); } };
