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
import { APP_CSS, appPage } from './ui';

const ALLOWED_HOSTS = new Set(['lunarlab.uk', '20100823.xyz']);
const PAGE_FEATURES: Record<string, Feature> = {
  tools: 'tools', mail: 'mail', mirror: 'mirror', store: 'store', admin: 'admin'
};

function asset(body: string, type: string, cache = 'no-store'): Response {
  return new Response(body, { headers: { 'content-type': type, 'cache-control': cache } });
}

function icon(accent: string): Response {
  const safe = /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#a78bfa';
  return asset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="118" fill="#f3edf7"/><circle cx="256" cy="256" r="154" fill="${safe}" opacity=".2"/><circle cx="256" cy="256" r="112" fill="${safe}"/><circle cx="306" cy="214" r="92" fill="#f3edf7"/></svg>`, 'image/svg+xml', 'public, max-age=3600');
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  if (isMirrorHostname(host)) return mirrorHostRoute(request, env, host);
  if (!ALLOWED_HOSTS.has(host)) throw new HttpError(421, 'host is not served here');

  const path = url.pathname.replace(/\/{2,}/g, '/');
  const profile = siteProfile(request, env);
  requireSameOrigin(request);

  if (path === '/assets/app.css' && request.method === 'GET') return asset(APP_CSS, 'text/css; charset=utf-8');
  if (path === '/assets/app.js' && request.method === 'GET') return asset(APP_JS, 'text/javascript; charset=utf-8');
  if (path === '/assets/auth.js' && request.method === 'GET') return asset(AUTH_JS, 'text/javascript; charset=utf-8');
  if (path === '/icon.svg' && request.method === 'GET') return icon(profile.accent);
  if (path === '/' && request.method === 'GET') return html(appPage(profile, path));
  if (path === '/healthz' && request.method === 'GET') return json({ ok: true });
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
