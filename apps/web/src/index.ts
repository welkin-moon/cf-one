import type { Env } from './env';
import { adminRoutes } from './admin';
import { authRoutes } from './auth-routes';
import { AUTH_JS } from './auth-client';
import { APP_JS } from './client';
import { requireFeature, siteProfile, type Feature } from './config';
import { toolsRoutes } from './features';
import { HttpError, html, json, withSecurityHeaders } from './http';
import { mailRoutes, receiveEmail } from './mail';
import { isMirrorHostname, mirrorApiRoutes } from './mirror';
import { mirrorHostRoute } from './mirror-host';
import { ownerAuthRoutes } from './owner';
import { requireSameOrigin } from './security';
import { guardStorageRequest } from './storage-guard';
import { storageRoutes } from './storage';
import { createTestRoute } from './test-create';
import { testStudioRoutes } from './test-studio';
import { TEST_RUNNER_JS, TEST_STUDIO_JS, testDirectoryPage, testRunPage, testStudioPage } from './test-pages';
import { APP_CSS, appPage } from './ui';

const ALLOWED_HOSTS = new Set(['lunarlab.uk', '20100823.xyz']);
const MIRROR_RUNTIME_PATH = '/__cfone_runtime__.js';
const MIRROR_REWRITE_LIMIT = 6 * 1024 * 1024;
const DOWNSTREAM_IDENTITY_HEADERS = ['cf-brapi-request-id', 'cf-brapi-devtools', 'cf-biso-devtools', 'signature-agent', 'signature', 'signature-input'];
const MIRROR_PATH_COMPAT: Record<string, Array<{ pattern: RegExp; prefix: string }>> = {
  'x.com': [{ pattern: /^\/1\.1\//, prefix: '/i/api' }]
};
const PAGE_FEATURES: Record<string, Feature> = {
  files: 'files', tools: 'tools', mail: 'mail', mirror: 'mirror', store: 'store', admin: 'admin'
};

function asset(body: string, type: string, cache = 'no-store'): Response {
  return new Response(body, { headers: { 'content-type': type, 'cache-control': cache } });
}

function icon(accent: string): Response {
  const safe = /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#a78bfa';
  return asset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="118" fill="#f3edf7"/><circle cx="256" cy="256" r="154" fill="${safe}" opacity=".2"/><circle cx="256" cy="256" r="112" fill="${safe}"/><circle cx="306" cy="214" r="92" fill="#f3edf7"/></svg>`, 'image/svg+xml', 'public, max-age=3600');
}

function homeWithTest(body: string): string {
  const card = `<a class="feature-card" href="/app/test"><span class="feature-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8M9 3v4l-5 9a3 3 0 0 0 2.6 4.5h10.8A3 3 0 0 0 20 16l-5-9V3M7 14h10"/></svg></span><div><h3>Test</h3><p>创建心理测试、问卷、题目和投票，并查看匿名统计。</p></div><span class="feature-arrow" aria-hidden="true">→</span></a>`;
  return body.replace('</section><footer class="site-footer">', `${card}</section><footer class="site-footer">`);
}

function mirrorRuntimeScript(upstreamOrigin: string): string {
  const origin = JSON.stringify(upstreamOrigin);
  return `(()=>{\n` +
    `  const upstream=new URL(${origin});\n` +
    `  const real=window.location;\n` +
    `  const root=document.documentElement;\n` +
    `  const encode=value=>{try{const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}catch{return ''}};\n` +
    `  const record=(name,value)=>{const encoded=encode(value);if(encoded)root.setAttribute(name,encoded.slice(0,1800))};\n` +
    `  root.setAttribute('data-cf-one-runtime-ready','1');\n` +
    `  const upstreamHref=()=>upstream.origin+real.pathname+real.search+real.hash;\n` +
    `  const mapNavigation=value=>{\n` +
    `    try{\n` +
    `      const target=new URL(String(value),upstreamHref());\n` +
    `      if(target.origin===upstream.origin)return real.origin+target.pathname+target.search+target.hash;\n` +
    `      return target.href;\n` +
    `    }catch{return String(value);}\n` +
    `  };\n` +
    `  const virtual={\n` +
    `    get origin(){return upstream.origin},\n` +
    `    get protocol(){return upstream.protocol},\n` +
    `    get hostname(){return upstream.hostname},\n` +
    `    get host(){return upstream.host},\n` +
    `    get port(){return upstream.port},\n` +
    `    get href(){return upstreamHref()},\n` +
    `    set href(value){real.href=mapNavigation(value)},\n` +
    `    assign(value){real.assign(mapNavigation(value))},\n` +
    `    replace(value){real.replace(mapNavigation(value))},\n` +
    `    reload(){real.reload()},\n` +
    `    toString(){return upstreamHref()},\n` +
    `    valueOf(){return upstreamHref()}\n` +
    `  };\n` +
    `  Object.defineProperty(globalThis,'__cfoneVirtualLocation',{value:virtual,writable:false,configurable:false});\n` +
    `  addEventListener('error',event=>record('data-cf-one-error',{message:String(event.message||event.error?.message||'error').slice(0,320),file:String(event.filename||'').split('/').pop(),line:event.lineno||0,column:event.colno||0}),true);\n` +
    `  addEventListener('unhandledrejection',event=>record('data-cf-one-rejection',{name:String(event.reason?.name||''),reason:String(event.reason?.message||event.reason||'rejection').slice(0,420)}),true);\n` +
    `  const probeLogin=()=>{\n` +
    `    const input=document.querySelector('input[autocomplete*="username"],input[type="email"],input[name*="user" i]');\n` +
    `    if(!input){record('data-cf-one-login-probe',{found:false});return}\n` +
    `    const style=getComputedStyle(input);const rect=input.getBoundingClientRect();let hiddenAncestor=null;\n` +
    `    for(let node=input,depth=0;node&&node.nodeType===1&&depth<10;node=node.parentElement,depth++){\n` +
    `      const current=getComputedStyle(node);\n` +
    `      if(node.hidden||node.getAttribute('aria-hidden')==='true'||current.display==='none'||current.visibility==='hidden'||Number(current.opacity)===0){hiddenAncestor={depth,tag:node.tagName,display:current.display,visibility:current.visibility,opacity:current.opacity,hidden:Boolean(node.hidden),ariaHidden:node.getAttribute('aria-hidden')};break}\n` +
    `    }\n` +
    `    record('data-cf-one-login-probe',{found:true,display:style.display,visibility:style.visibility,opacity:style.opacity,pointerEvents:style.pointerEvents,disabled:Boolean(input.disabled),hidden:Boolean(input.hidden),ariaHidden:input.getAttribute('aria-hidden'),rect:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)},hiddenAncestor});\n` +
    `  };\n` +
    `  document.addEventListener('DOMContentLoaded',()=>{probeLogin();setTimeout(probeLogin,1000);setTimeout(probeLogin,3000);setTimeout(probeLogin,7000)},{once:true});\n` +
    `  addEventListener('load',probeLogin,{once:true});\n` +
    `})();`;
}

function rewriteMirrorJavaScript(source: string): string {
  const helper = 'globalThis.__cfoneVirtualLocation';
  let output = source.replace(
    /\b(?:window|globalThis|self|document)\.location\.(origin|hostname|host|protocol|port|href)\b/g,
    (_match, property: string) => `${helper}.${property}`
  );
  output = output.replace(
    /(^|[^A-Za-z0-9_$.])location\.(origin|hostname|host|protocol|port|href)\b/g,
    (_match, prefix: string, property: string) => `${prefix}${helper}.${property}`
  );
  return output;
}

function htmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function injectMirrorRuntime(htmlText: string): string {
  const firstScript = /<script\b([^>]*)>/i;
  if (firstScript.test(htmlText)) {
    return htmlText.replace(firstScript, (tag, attributes: string) => {
      const nonce = attributes.match(/\bnonce\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const nonceValue = nonce?.[1] ?? nonce?.[2] ?? nonce?.[3] ?? '';
      const nonceAttribute = nonceValue ? ` nonce="${htmlAttribute(nonceValue)}"` : '';
      return `<script src="${MIRROR_RUNTIME_PATH}" data-cf-one-runtime="1"${nonceAttribute}></script>${tag}`;
    });
  }
  return htmlText.replace(/<head\b[^>]*>/i, tag => `${tag}<script src="${MIRROR_RUNTIME_PATH}" data-cf-one-runtime="1"></script>`);
}

function rewriteMirrorHtml(htmlText: string): string {
  let output = htmlText.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (whole, open: string, body: string, close: string) => {
    if (/\bsrc\s*=/i.test(open)) return whole;
    return `${open}${rewriteMirrorJavaScript(body)}${close}`;
  });
  output = injectMirrorRuntime(output);
  return output;
}

function rewrittenMirrorResponse(response: Response, body: string): Response {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('content-md5');
  headers.delete('digest');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

function mirrorDiagnosticPath(pathname: string): string {
  return pathname.replace(/^\/__cfone_origin__\/[^/]+\/[^/]+/, '/__cfone_origin__/REDACTED');
}

function cookieCount(value: string | null): number {
  return value ? value.split(';').map(part => part.trim()).filter(Boolean).length : 0;
}

function setCookieCount(headers: Headers): number {
  const modern = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof modern.getSetCookie === 'function') return modern.getSetCookie().length;
  return headers.has('set-cookie') ? 1 : 0;
}

async function logMirrorClientResponse(request: Request, response: Response, pathname: string): Promise<void> {
  if (request.headers.get('sec-fetch-dest') !== 'empty') return;
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const summary: Record<string, unknown> = {
    path: mirrorDiagnosticPath(pathname),
    method: request.method,
    status: response.status,
    contentType: contentType.split(';')[0],
    requestCookieCount: cookieCount(request.headers.get('cookie')),
    setCookieCount: setCookieCount(response.headers)
  };
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  const readable = response.body && (!Number.isFinite(declaredLength) || declaredLength <= 1_000_000) &&
    (contentType.includes('json') || contentType.includes('text/html') || contentType.includes('text/plain'));
  if (readable) {
    try {
      const text = await response.clone().text();
      summary.bytes = text.length;
      summary.relayRefs = (text.match(/__cfone_origin__/g) ?? []).length;
      summary.hasEmailLabel = text.includes('Email or username');
      summary.hasContinuePhone = text.includes('Continue with phone');
      if (contentType.includes('json')) {
        try {
          const parsed: unknown = JSON.parse(text);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            summary.topLevelKeys = Object.keys(parsed as Record<string, unknown>).slice(0, 24);
            summary.hasErrorKey = Object.prototype.hasOwnProperty.call(parsed, 'error') || Object.prototype.hasOwnProperty.call(parsed, 'errors');
          }
        } catch {}
      }
    } catch {}
  }
  console.log('mirror.compat-diagnostic', JSON.stringify(summary));
}

async function mirrorRuntimeRoute(request: Request, env: Env, hostname: string): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) throw new HttpError(405, 'mirror runtime only supports GET and HEAD');
  const row = await env.DB.prepare(`SELECT slug, origin FROM mirror_targets
    WHERE lower(hostname) = ?1 AND state = 'active'`).bind(hostname.toLowerCase()).first<{ slug: string; origin: string }>();
  if (!row) throw new HttpError(404, 'mirror not found');
  let upstream: URL;
  try { upstream = new URL(row.origin); }
  catch { throw new HttpError(500, 'mirror origin is invalid'); }
  if (upstream.protocol !== 'https:' || upstream.username || upstream.password) throw new HttpError(500, 'mirror origin is invalid');
  const headers = new Headers({
    'content-type': 'text/javascript; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-cf-one-mirror': row.slug
  });
  const body = request.method === 'HEAD' ? null : mirrorRuntimeScript(upstream.origin);
  return new Response(body, { headers });
}

async function mirrorUpstreamRequest(request: Request, env: Env, hostname: string): Promise<Request> {
  const headers = new Headers(request.headers);
  let changed = false;
  for (const name of DOWNSTREAM_IDENTITY_HEADERS) {
    if (!headers.has(name)) continue;
    headers.delete(name);
    changed = true;
  }

  const incoming = new URL(request.url);
  let pathname = incoming.pathname;
  if (pathname.startsWith('/1.1/')) {
    const row = await env.DB.prepare(`SELECT origin_host FROM mirror_targets
      WHERE lower(hostname) = ?1 AND state = 'active'`).bind(hostname.toLowerCase()).first<{ origin_host: string }>();
    const rules = row ? MIRROR_PATH_COMPAT[row.origin_host.toLowerCase()] : undefined;
    const rule = rules?.find(candidate => candidate.pattern.test(pathname));
    if (rule) {
      pathname = `${rule.prefix}${pathname}`;
      incoming.pathname = pathname;
      changed = true;
    }
  }

  if (!changed) return request;
  return new Request(incoming.href, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: request.redirect
  });
}

async function mirrorCompatibilityRoute(request: Request, env: Env, hostname: string): Promise<Response> {
  const incoming = new URL(request.url);
  if (incoming.pathname === MIRROR_RUNTIME_PATH) return mirrorRuntimeRoute(request, env, hostname);

  const response = await mirrorHostRoute(await mirrorUpstreamRequest(request, env, hostname), env, hostname);
  await logMirrorClientResponse(request, response, incoming.pathname);
  if (request.method === 'HEAD' || !response.body) return response;

  const type = (response.headers.get('content-type') ?? '').toLowerCase();
  const length = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(length) && length > MIRROR_REWRITE_LIMIT) return response;

  if (type.includes('text/html')) {
    return rewrittenMirrorResponse(response, rewriteMirrorHtml(await response.text()));
  }
  if (type.includes('javascript') || type.includes('ecmascript')) {
    return rewrittenMirrorResponse(response, rewriteMirrorJavaScript(await response.text()));
  }
  return response;
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  if (isMirrorHostname(host)) return mirrorCompatibilityRoute(request, env, host);
  if (!ALLOWED_HOSTS.has(host)) throw new HttpError(421, 'host is not served here');

  const path = url.pathname.replace(/\/{2,}/g, '/');
  const profile = siteProfile(request, env);
  requireSameOrigin(request);

  if (path === '/assets/app.css' && request.method === 'GET') return asset(APP_CSS, 'text/css; charset=utf-8');
  if (path === '/assets/app.js' && request.method === 'GET') return asset(APP_JS, 'text/javascript; charset=utf-8');
  if (path === '/assets/auth.js' && request.method === 'GET') return asset(AUTH_JS, 'text/javascript; charset=utf-8');
  if (path === '/assets/test-studio.js' && request.method === 'GET') return asset(TEST_STUDIO_JS, 'text/javascript; charset=utf-8');
  if (path === '/assets/test-runner.js' && request.method === 'GET') return asset(TEST_RUNNER_JS, 'text/javascript; charset=utf-8');
  if (path === '/icon.svg' && request.method === 'GET') return icon(profile.accent);
  if (path === '/' && request.method === 'GET') return html(homeWithTest(appPage(profile, path)));
  if (path === '/healthz' && request.method === 'GET') return json({ ok: true });
  if (path === '/test' && request.method === 'GET') return html(testDirectoryPage(profile.name));
  const publicTestPage = path.match(/^\/test\/([A-Za-z0-9\u4e00-\u9fff-]{1,96})$/);
  if (publicTestPage && request.method === 'GET') return html(testRunPage(profile.name, publicTestPage[1]!), 200, { 'x-cf-one-test-sandbox': '1' });
  if (path === '/app/test' && request.method === 'GET') return html(testStudioPage(profile.name));
  if (path === '/manifest.webmanifest' && request.method === 'GET') {
    return json({
      id: '/',
      name: profile.name,
      short_name: profile.name.slice(0, 12),
      description: profile.tagline,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#fffbfe',
      theme_color: '#fffbfe',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    }, 200, { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-store' });
  }
  if (path === '/sw.js' && request.method === 'GET') {
    return new Response(`self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cf-one-')).map(key=>caches.delete(key)))),self.registration.unregister()]).then(()=>self.clients.claim())));`, {
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'service-worker-allowed': '/' }
    });
  }
  if (path.startsWith('/app/') && request.method === 'GET') {
    const page = path.split('/').filter(Boolean).pop() ?? '';
    if (page !== 'login') {
      const feature = PAGE_FEATURES[page];
      if (!feature) throw new HttpError(404, 'app page not found');
      requireFeature(profile, feature);
    }
    return html(appPage(profile, path));
  }

  const handlers: Array<() => Promise<Response | null>> = [
    async () => {
      if (!path.startsWith('/api/auth/')) return null;
      const ownerRequest = request.clone() as unknown as Request;
      const owner = await ownerAuthRoutes(ownerRequest, env, path);
      return owner ?? authRoutes(request, env, path);
    },
    async () => { if (!path.startsWith('/api/tools/')) return null; requireFeature(profile, 'tools'); return toolsRoutes(request, path); },
    async () => {
      if (!path.startsWith('/api/storage/')) return null;
      requireFeature(profile, 'files');
      await guardStorageRequest(request, env);
      return storageRoutes(request, env, path);
    },
    async () => { if (!path.startsWith('/api/mail/')) return null; requireFeature(profile, 'mail'); return mailRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/mirror/')) return null; requireFeature(profile, 'mirror'); return mirrorApiRoutes(request, env, path); },
    async () => { if (path !== '/api/test') return null; return createTestRoute(request, env, path); },
    async () => { if (!path.startsWith('/api/test/')) return null; return testStudioRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/admin/')) return null; requireFeature(profile, 'admin'); return adminRoutes(request, env, path); }
  ];
  for (const handler of handlers) {
    const response = await handler();
    if (response) return response;
  }
  throw new HttpError(404, 'not found');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return withSecurityHeaders(await route(request, env));
    } catch (error) {
      if (error instanceof HttpError) return withSecurityHeaders(json({ error: error.message }, error.status));
      console.error(error);
      return withSecurityHeaders(json({ error: 'internal server error' }, 500));
    }
  },
  async email(message: { from: string; to: string; raw: ReadableStream; rawSize?: number; setReject(reason: string): void }, env: Env): Promise<void> {
    await receiveEmail(message, env);
  }
};
