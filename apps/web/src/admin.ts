import type { Env } from './env';
import { requireAdmin } from './auth';
import { HttpError, json } from './http';

async function cloudflare(env: Env, path: string): Promise<unknown> {
  if (!env.CF_API_TOKEN) throw new HttpError(503, 'CF_API_TOKEN is not configured');
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, accept: 'application/json' }
  });
  const body = await response.json<unknown>();
  if (!response.ok) throw new HttpError(response.status, 'Cloudflare API request failed');
  return body;
}

export async function adminRoutes(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/admin/')) return null;
  const session = await requireAdmin(request, env);
  if (path === '/api/admin/cf/zones' && request.method === 'GET') {
    await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)').bind(session.sub, 'cf.zones.list', 'zones').run();
    return json(await cloudflare(env, '/zones?per_page=50'));
  }
  const dns = path.match(/^\/api\/admin\/cf\/zones\/([a-f0-9]+)\/dns-records$/i);
  if (dns && request.method === 'GET') {
    await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target) VALUES (?1, ?2, ?3)').bind(session.sub, 'cf.dns.list', dns[1]).run();
    return json(await cloudflare(env, `/zones/${dns[1]}/dns_records?per_page=100`));
  }
  throw new HttpError(404, 'admin route not found');
}
