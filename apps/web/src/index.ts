import type { Env } from './env';
import { adminRoutes } from './admin';
import { authRoutes } from './auth-routes';
import { APP_JS } from './client';
import { requireFeature, siteProfile, type Feature } from './config';
import { chatRoutes, socialRoutes, toolsRoutes } from './features';
import { HttpError, html, json, withSecurityHeaders } from './http';
import { mailRoutes, receiveEmail } from './mail';
import { isMirrorHostname, mirrorApiRoutes, mirrorHostRoute } from './mirror';
import { ownerAuthRoutes } from './owner';
import { requireSameOrigin } from './security';
import { APP_CSS, appPage } from './ui';

const ALLOWED_HOSTS = new Set(['lunarlab.uk', '20100823.xyz']);
const PAGE_FEATURES: Record<string, Feature> = {
  chat: 'chat', social: 'social', tools: 'tools', mail: 'mail', mirror: 'mirror', store: 'store', admin: 'admin'
};

function asset(body: string, type: string): Response {
  return new Response(body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=300, stale-while-revalidate=86400' } });
}

function icon(accent: string): Response {
  const safe = /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#a78bfa';
  return asset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="118" fill="#090b12"/><circle cx="256" cy="256" r="154" fill="none" stroke="${safe}" stroke-width="28"/><path d="M351 130a159 159 0 1 0 0 252 135 135 0 1 1 0-252Z" fill="${safe}"/></svg>`, 'image/svg+xml');
}

const MIRROR_CLIENT = String.raw`async function renderMirror() {
  if (!requireLogin()) return;
  clear(app);
  const list = h("div", { class: "list" });
  const form = h("form", null,
    field("HTTPS 源站", "origin", "url", "https://example.com/", true),
    field("名称", "label", "text", "可选备注", false),
    h("button", { class: "primary", type: "submit", text: "申请镜像域名" })
  );
  app.append(h("div", { class: "split" },
    panel("申请镜像", h("div", { class: "callout", text: "系统会自动分配 m1、m2… .20100823.xyz，并把这个独立子域绑定到固定 HTTPS 源站。不会创建通配路由，也不会碰 P1 或其他已有子域。" }), form),
    panel("我的镜像", list)
  ));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const created = await api("/api/mirror/targets", { method: "POST", body: formValues(form) });
      form.reset();
      showToast("已分配 " + created.target.hostname);
      await load();
    } catch (error) { showToast(error.message, true); }
    finally { button.disabled = false; }
  });
  async function load() {
    const response = await api("/api/mirror/targets");
    clear(list);
    if (!response.targets.length) list.append(h("p", { class: "muted", text: "还没有镜像。提交一个 HTTPS 源站即可自动分配。" }));
    for (const target of response.targets) {
      const open = target.state === "active" ? h("a", { class: "button tiny", href: target.url, target: "_blank", rel: "noreferrer", text: "打开" }) : null;
      const remove = ["active", "pending"].includes(target.state) ? h("button", { class: "danger tiny", text: "移除", onclick: async () => {
        if (!confirm("移除 " + target.hostname + "？这会解绑对应 Custom Domain。")) return;
        try { await api("/api/mirror/targets/" + target.id, { method: "DELETE" }); await load(); }
        catch (error) { showToast(error.message, true); }
      }}) : null;
      list.append(h("div", { class: "list-item" },
        h("div", { class: "row between" }, h("strong", { text: target.hostname }), h("span", { class: "pill", text: target.state })),
        h("div", { class: "muted tiny", text: target.origin }),
        h("div", { class: "row", style: "margin-top:10px" }, open, remove)
      ));
    }
  }
  try { await load(); } catch (error) { showToast(error.message, true); }
}

function renderStore()`;

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  if (isMirrorHostname(host)) return mirrorHostRoute(request, env, host);
  if (!ALLOWED_HOSTS.has(host)) {
    throw new HttpError(421, 'cf-one only serves the two apex domains; unrelated subdomains keep their existing origin or Tunnel route');
  }
  const path = url.pathname.replace(/\/{2,}/g, '/');
  const profile = siteProfile(request, env);
  requireSameOrigin(request);

  if (path === '/assets/app.css' && request.method === 'GET') return asset(APP_CSS, 'text/css; charset=utf-8');
  if (path === '/assets/app.js' && request.method === 'GET') {
    const ownerAware = APP_JS
      .replace('field("邮箱", "email", "email", "you@example.com", true)', 'field("用户名 / 邮箱", "email", "text", "admin 或 you@example.com", true)')
      .replace('panel("成员登录", form)', 'panel("站主 / 成员登录", form)')
      .replace('if (String(values.password || "").length < 10 || String(values.password || "").length > 256)', 'if ((String(values.email || "").trim().toLowerCase() !== "admin" && String(values.password || "").length < 10) || String(values.password || "").length > 256)')
      .replace('密码必须为 10–256 个字符', '成员密码必须为 10–256 个字符');
    const mirrorAware = ownerAware.replace(/async function renderMirror\(\) \{[\s\S]*?\n\}\n\nfunction renderStore\(\)/, MIRROR_CLIENT);
    return asset(mirrorAware, 'text/javascript; charset=utf-8');
  }
  if (path === '/icon.svg' && request.method === 'GET') return icon(profile.accent);
  if (path === '/' && request.method === 'GET') return html(appPage(profile, path));
  if (path === '/healthz' && request.method === 'GET') return json({ ok: true, service: 'cf-one-apex', host: profile.host, features: profile.features, now: new Date().toISOString() });
  if (path === '/manifest.webmanifest' && request.method === 'GET') {
    return json({
      id: '/', name: profile.name, short_name: profile.name.slice(0, 12), description: profile.tagline,
      start_url: '/', scope: '/', display: 'standalone', background_color: '#090b12', theme_color: '#090b12',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    }, 200, { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=300' });
  }
  if (path === '/sw.js' && request.method === 'GET') {
    return new Response(`const CACHE='cf-one-v4';const SHELL=['/','/assets/app.css','/assets/app.js','/icon.svg'];self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/'))))});`, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', 'service-worker-allowed': '/' } });
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
    async () => { if (!path.startsWith('/api/chat/')) return null; requireFeature(profile, 'chat'); return chatRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/social/')) return null; requireFeature(profile, 'social'); return socialRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/mail/')) return null; requireFeature(profile, 'mail'); return mailRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/mirror/')) return null; requireFeature(profile, 'mirror'); return mirrorApiRoutes(request, env, path); },
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
