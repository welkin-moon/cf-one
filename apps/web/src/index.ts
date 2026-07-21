import type { Env } from './env';
import { adminRoutes } from './admin';
import { authRoutes, chatRoutes, socialRoutes, toolsRoutes } from './features';
import { HttpError, html, json, withSecurityHeaders } from './http';
import { receiveEmail } from './mail';
import { mirrorRoute } from './mirror';
import { homePage, placeholderPage } from './ui';

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/{2,}/g, '/');

  if (path === '/' && request.method === 'GET') return html(homePage(env.APP_NAME || 'Lunar Lab'));
  if (path === '/healthz') return json({ ok: true, service: 'cf-one', now: new Date().toISOString() });
  if (path === '/manifest.webmanifest') return json({ name: env.APP_NAME || 'Lunar Lab', short_name: 'Lunar', start_url: '/', display: 'standalone', background_color: '#0b1020', theme_color: '#111827', icons: [] }, 200, { 'content-type': 'application/manifest+json' });
  if (path === '/sw.js') return new Response("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));", { headers: { 'content-type': 'application/javascript', 'cache-control': 'no-cache' } });
  if (path.startsWith('/app/') && request.method === 'GET') return html(placeholderPage(path.split('/').pop() ?? 'App'));

  const handlers = [
    () => authRoutes(request, env, path),
    () => toolsRoutes(request, path),
    () => chatRoutes(request, env, path),
    () => socialRoutes(request, env, path),
    () => adminRoutes(request, env, path),
    () => mirrorRoute(request, env, path)
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
  async email(message: { from: string; to: string; raw: ReadableStream; setReject(reason: string): void }, env: Env): Promise<void> {
    await receiveEmail(message, env);
  }
};
