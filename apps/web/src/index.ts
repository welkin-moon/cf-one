import type { Env } from './env';
import { adminRoutes } from './admin';
import { APP_JS } from './client';
import { requireFeature, siteProfile, type Feature } from './config';
import { authRoutes, chatRoutes, socialRoutes, toolsRoutes } from './features';
import { HttpError, html, json, withSecurityHeaders } from './http';
import { mailRoutes, receiveEmail } from './mail';
import { mirrorRoute } from './mirror';
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

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    throw new HttpError(421, 'cf-one only serves the two apex domains; subdomains must keep their existing origin or Tunnel route');
  }
  const path = url.pathname.replace(/\/{2,}/g, '/');
  const profile = siteProfile(request, env);
  requireSameOrigin(request);

  if (path === '/assets/app.css' && request.method === 'GET') return asset(APP_CSS, 'text/css; charset=utf-8');
  if (path === '/assets/app.js' && request.method === 'GET') {
    const ownerAware = APP_JS
      .replace('field("邮箱", "email", "email", "you@example.com", true)', 'field("用户名 / 邮箱", "email", "text", "admin 或 you@example.com", true)')
      .replace('panel("成员登录", form)', 'panel("站主 / 成员登录", form)');
    return asset(ownerAware, 'text/javascript; charset=utf-8');
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
    return new Response(`const CACHE='cf-one-v2';const SHELL=['/','/assets/app.css','/assets/app.js','/icon.svg'];self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/mirror/'))return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/'))))});`, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', 'service-worker-allowed': '/' } });
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
    () => ownerAuthRoutes(request, env, path),
    () => authRoutes(request, env, path),
    async () => { if (!path.startsWith('/api/tools/')) return null; requireFeature(profile, 'tools'); return toolsRoutes(request, path); },
    async () => { if (!path.startsWith('/api/chat/')) return null; requireFeature(profile, 'chat'); return chatRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/social/')) return null; requireFeature(profile, 'social'); return socialRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/mail/')) return null; requireFeature(profile, 'mail'); return mailRoutes(request, env, path); },
    async () => { if (!path.startsWith('/api/admin/')) return null; requireFeature(profile, 'admin'); return adminRoutes(request, env, path); },
    async () => { if (!path.startsWith('/mirror/')) return null; requireFeature(profile, 'mirror'); return mirrorRoute(request, env, path); }
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
