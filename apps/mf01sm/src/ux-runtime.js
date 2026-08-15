import runtime from './runtime.js';

const MAIN_UX = String.raw`
<style id="mf01sm-material-you-ux">
html{background:#141218;-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-behavior:smooth}
body{min-width:0;min-height:100dvh;overflow-x:hidden;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);background:var(--bg);font-feature-settings:"kern" 1,"liga" 1}
body[data-theme="dark"]{--bg:#141218;--card:#211f26;--card2:#2b2930;--text:#e6e1e5;--muted:#cac4d0;--line:#49454f;--accent:#d0bcff;--accent-container:#4f378b;--on-accent:#381e72;--surface-1:#1d1b20;--surface-2:#211f26;--surface-3:#2b2930;--surface-4:#36343b;--ok:#a8d5ba;--warn:#f4d06f;--bad:#ffb4ab;--shadow:rgba(0,0,0,.34)}
body[data-theme="light"]{--bg:#fffbfe;--card:#fffbfe;--card2:#f3edf7;--text:#1d1b20;--muted:#625b71;--line:#cac4d0;--accent:#6750a4;--accent-container:#eaddff;--on-accent:#fff;--surface-1:#fffbfe;--surface-2:#f7f2fa;--surface-3:#f3edf7;--surface-4:#ece6f0;--ok:#2e6a47;--warn:#7a5900;--bad:#b3261e;--shadow:rgba(29,27,32,.14)}
*{min-width:0}
button,input{font:inherit}
button,.choice,.scale-option{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.wrap{width:min(1040px,calc(100% - 32px));margin-inline:auto;padding:clamp(18px,4vw,40px) 0 calc(72px + env(safe-area-inset-bottom))}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 22px;flex-wrap:wrap}
.top>div{min-width:0}
h1,h2,h3,.q,.result-title{overflow-wrap:anywhere;text-wrap:balance}
h1{font-size:clamp(2rem,5vw,3.25rem);letter-spacing:-.035em;line-height:1.06;margin:.18em 0 .05em}
h2{font-size:clamp(1.3rem,3vw,1.65rem);letter-spacing:-.015em;margin:0 0 12px}
h3{font-size:1.12rem;margin:24px 0 14px}
p{margin:.6em 0 1em}
.pill{min-height:30px;display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:var(--surface-3);color:var(--muted);font-weight:650;letter-spacing:.01em;border:1px solid color-mix(in srgb,var(--line) 58%,transparent)}
.card{background:var(--surface-2);border:1px solid color-mix(in srgb,var(--line) 72%,transparent);border-radius:28px;padding:clamp(20px,4vw,32px);margin:14px 0;box-shadow:0 2px 3px var(--shadow),0 10px 28px color-mix(in srgb,var(--shadow) 42%,transparent);overflow:clip}
.muted{color:var(--muted)}
.note{padding:16px 18px;border-radius:20px;background:var(--surface-3);color:var(--muted);border:1px solid color-mix(in srgb,var(--line) 52%,transparent);line-height:1.72;overflow-wrap:anywhere}
.note b{color:var(--text)}
.field{display:grid;gap:9px;margin:20px 0}
.field label{font-weight:760;line-height:1.4}
input{width:100%;min-height:56px;border-radius:18px;border:1px solid var(--line);background:var(--surface-3);color:var(--text);padding:0 16px;font-size:16px;outline:none;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 24%,transparent);background:var(--surface-2)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px}
.likert{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px}
.choice{width:100%;min-height:56px;border:1px solid var(--line);border-radius:18px;padding:14px 16px;background:var(--surface-2);color:var(--text);text-align:left;line-height:1.42;overflow-wrap:anywhere;cursor:pointer;transition:background .16s ease,border-color .16s ease,transform .16s ease,box-shadow .16s ease}
.choice.active{border-color:var(--accent);background:var(--accent-container);color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 56%,transparent)}
.button{min-height:52px;border:0;border-radius:999px;padding:0 22px;font-weight:760;letter-spacing:.01em;background:var(--accent);color:var(--on-accent);cursor:pointer;box-shadow:0 1px 2px var(--shadow);transition:transform .16s ease,box-shadow .16s ease,filter .16s ease}
.button.secondary{background:var(--surface-3);color:var(--text);border:1px solid var(--line);box-shadow:none}
.actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:24px}
.progress{height:10px;border-radius:999px;background:var(--surface-4);overflow:hidden}
.progress span{height:100%;border-radius:inherit;background:var(--accent);transition:width .22s cubic-bezier(.2,0,0,1)}
.q{font-size:clamp(1.14rem,2.4vw,1.38rem);font-weight:760;line-height:1.52;margin:22px 0}
#quiz .scale{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
#quiz .scale-option{min-height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:14px 10px;border:1px solid var(--line);border-radius:20px;background:var(--surface-2);color:var(--text);text-align:center;line-height:1.3;cursor:pointer;transition:background .16s ease,border-color .16s ease,transform .16s ease,box-shadow .16s ease}
#quiz .scale-option.active{background:var(--accent-container);border-color:var(--accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 58%,transparent)}
.num{flex:0 0 auto;display:grid;place-items:center;width:36px;height:36px;border-radius:999px;background:var(--surface-4);font-weight:800}
.scale-option.active .num{background:var(--accent);color:var(--on-accent)}
#quiz .actions{position:sticky;z-index:5;bottom:max(10px,env(safe-area-inset-bottom));padding:10px;border:1px solid color-mix(in srgb,var(--line) 72%,transparent);border-radius:22px;background:color-mix(in srgb,var(--surface-2) 92%,transparent);box-shadow:0 10px 30px var(--shadow)}
#quiz .actions .button{flex:1 1 180px}
.result-title{font-size:clamp(1.45rem,4vw,2.15rem);line-height:1.2;margin:12px 0 18px}
.result-block{padding:18px 0;border-top:1px solid color-mix(in srgb,var(--line) 65%,transparent)}
.result-block:first-child{border-top:0}
.bars{display:grid;gap:14px}
.barrow{display:grid;grid-template-columns:minmax(0,180px) minmax(0,1fr) auto;gap:10px 14px;align-items:center}
.barrow>span:first-child{overflow-wrap:anywhere}
.bartrack{height:12px;border-radius:999px;background:var(--surface-4);overflow:hidden}
.bartrack span{height:100%;border-radius:inherit;background:var(--accent)}
.quality.good{color:var(--ok)}.quality.mid{color:var(--warn)}.quality.low{color:var(--bad)}
.tiny{font-size:.875rem;line-height:1.6}
.hidden{display:none!important}
@media (hover:hover) and (pointer:fine){.choice:hover,.scale-option:hover{border-color:var(--accent);background:var(--surface-3);transform:translateY(-1px)}.button:hover{filter:brightness(1.06);box-shadow:0 3px 8px var(--shadow);transform:translateY(-1px)}.button.secondary:hover{background:var(--surface-4)}}
@media (max-width:779px){
  .wrap{width:min(100% - 20px,720px);padding-top:18px}
  .top{align-items:flex-start;margin-bottom:14px}
  .card{border-radius:24px;padding:20px}
  .grid,.likert{grid-template-columns:1fr 1fr}
  #quiz .scale{grid-template-columns:1fr}
  #quiz .scale-option{min-height:58px;flex-direction:row;justify-content:flex-start;text-align:left;padding:10px 12px}
  #quiz .actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  #quiz .actions .button{width:100%;padding-inline:14px}
  .barrow{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px}
  .bartrack{grid-column:1/-1;height:12px}
}
@media (max-width:520px){
  .wrap{width:100%;padding:10px 10px calc(56px + env(safe-area-inset-bottom))}
  .top{padding:4px 4px 0;gap:10px}
  .top .button{min-height:44px;padding:0 16px}
  .card{padding:18px 16px;border-radius:22px;margin:10px 0}
  .grid,.likert{grid-template-columns:1fr}
  .choice{min-height:54px;padding:13px 14px}
  #quiz .actions{bottom:max(6px,env(safe-area-inset-bottom));margin-inline:-2px}
  .note{padding:14px 15px;border-radius:18px}
  h1{font-size:clamp(1.9rem,10vw,2.5rem)}
}
@media (max-height:560px) and (min-width:680px){.wrap{padding-top:12px}.card{padding-block:18px}.q{margin:14px 0}#quiz .scale-option{min-height:74px}#quiz .actions{margin-top:14px}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.choice,.scale-option,.button,.progress span,input{transition:none!important}}
</style>`;

const ADMIN_UX = String.raw`
<style id="mf01sm-admin-material-ux">
html{background:#141218;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{min-width:0;min-height:100dvh;margin:0;background:#141218;color:#e6e1e5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
.wrap{width:min(1680px,calc(100% - 28px));margin:auto;padding:24px 0 calc(48px + env(safe-area-inset-bottom))}
.login{width:min(460px,100%);margin:14vh auto 0}
.card{background:#211f26;border:1px solid #49454f;border-radius:28px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.28)}
h1,h2{letter-spacing:-.02em;overflow-wrap:anywhere}
input,button{font:inherit;min-height:52px;border-radius:999px;border:1px solid #49454f}
input{width:100%;box-sizing:border-box;background:#2b2930;color:#e6e1e5;padding:0 16px;font-size:16px;outline:none}
input:focus{border-color:#d0bcff;box-shadow:0 0 0 3px rgba(208,188,255,.18)}
button{margin-top:10px;padding:0 20px;background:#d0bcff;color:#381e72;font-weight:760;cursor:pointer}
.muted{color:#cac4d0;line-height:1.6}
.table{margin-top:18px;overflow:auto;overscroll-behavior:contain;border:1px solid #49454f;border-radius:24px;background:#211f26;max-height:76dvh;box-shadow:0 8px 26px rgba(0,0,0,.22)}
table{border-collapse:separate;border-spacing:0;width:100%;min-width:1180px;background:#211f26}
th,td{padding:12px 14px;border-bottom:1px solid #39363d;text-align:left;vertical-align:top;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
th{position:sticky;top:0;z-index:3;background:#2b2930;color:#e6e1e5;font-weight:760}
th:first-child,td:first-child{position:sticky;left:0;z-index:2;background:#211f26}
th:first-child{z-index:4;background:#2b2930}
tr:hover td{background:#27242b}
tr:hover td:first-child{background:#27242b}
.tag{color:#efb8c8;font-weight:760}
.hidden{display:none!important}
@media(max-width:720px){.wrap{width:100%;padding:12px 10px calc(36px + env(safe-area-inset-bottom))}.login{margin-top:10vh}.card{padding:20px 16px;border-radius:24px}.table{border-radius:20px;max-height:72dvh}th,td{padding:10px 12px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style>`;

function injectStyle(html, style) {
  const viewport = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';
  html = html.replace(/<meta name="viewport" content="[^"]*">/, viewport);
  return html.replace('</head>', `${style}</head>`);
}

async function enhance(request, env, ctx) {
  const response = await runtime.fetch(request, env, ctx);
  if (request.method !== 'GET') return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const url = new URL(request.url);
  if (url.pathname !== '/' && url.pathname !== '/admin') return response;

  const original = await response.text();
  const body = injectStyle(original, url.pathname === '/admin' ? ADMIN_UX : MAIN_UX);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  fetch(request, env, ctx) {
    return enhance(request, env, ctx);
  }
};
