import { renderHome } from './ui';
import { roleCapabilities, type NodeManifest, type NodeRole } from './protocol';

interface Env {
  CALIFA_ROLE?: string;
  CALIFA_NETWORK?: string;
  CALIFA_NODE_NAME?: string;
}

function json(value: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}

function roleFromEnv(value: string | undefined): NodeRole {
  return value === 'relay' || value === 'circle' ? value : 'user';
}

function manifest(request: Request, env: Env): NodeManifest {
  const role = roleFromEnv(env.CALIFA_ROLE);
  const origin = new URL(request.url).origin;
  return {
    protocol: 'califa/1',
    role,
    network: env.CALIFA_NETWORK || 'califa-dev',
    name: env.CALIFA_NODE_NAME || `Califa ${role} node`,
    endpoints: {
      manifest: `${origin}/.well-known/califa-node.json`,
      health: `${origin}/healthz`,
      api: `${origin}/api/v1`,
      compatibility: `${origin}/api/v1/compatibility`
    },
    capabilities: roleCapabilities(role),
    clientCompatibility: {
      protocolVersions: [1],
      contentEnvelope: 'encrypted-object-v1',
      eventFormat: 'signed-event-v1'
    }
  };
}

function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('content-security-policy', "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const node = manifest(request, env);

  if (request.method === 'GET' && url.pathname === '/') {
    return new Response(renderHome(node), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' }
    });
  }
  if (request.method === 'GET' && url.pathname === '/healthz') {
    return json({ ok: true, role: node.role, network: node.network, now: new Date().toISOString() });
  }
  if (request.method === 'GET' && url.pathname === '/.well-known/califa-node.json') {
    return json(node, 200, { 'cache-control': 'public, max-age=300' });
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/compatibility') {
    return json({
      protocol: node.protocol,
      role: node.role,
      accepts: ['application/json', 'application/cbor'],
      events: node.clientCompatibility.eventFormat,
      content: node.clientCompatibility.contentEnvelope,
      note: 'Client implementations should rely on capability discovery instead of hard-coding node roles.'
    });
  }
  if (request.method === 'GET' && url.pathname === '/api/v1') {
    return json({ node, routes: ['/api/v1/compatibility'] });
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return securityHeaders(await route(request, env));
    } catch (error) {
      console.error(error);
      return securityHeaders(json({ error: 'internal server error' }, 500));
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    console.log(JSON.stringify({
      service: 'califa-web-core',
      role: roleFromEnv(env.CALIFA_ROLE),
      task: 'scheduled-archive-placeholder',
      at: new Date().toISOString()
    }));
  }
};
