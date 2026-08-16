import v36Runtime from './v36-runtime.js';

const SCORE_AXIS_V36 = String.raw`function scoreAxis(key){const vals=QUESTIONS.map((q,i)=>{if(q.key!==key)return null;const raw=state.answers[i];if(raw===null)return null;return q.reverse?6-raw:raw;}).filter(v=>v!==null);if(!vals.length)return 0;const mean=vals.reduce((a,b)=>a+b,0)/vals.length;return Math.round((mean-1)/4*100);}`;

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
    const body = patchScoring(await response.text());
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  }
};
