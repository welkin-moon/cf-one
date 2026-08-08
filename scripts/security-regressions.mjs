import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFile(path.join(root, relative), 'utf8');

const [wrangler, provision, index, auth, owner, deploy, mirror, admin, authRoutes, ui, client, authChallenge, authMigration] = await Promise.all([
  read('apps/web/wrangler.toml'),
  read('scripts/provision-cloudflare.mjs'),
  read('apps/web/src/index.ts'),
  read('apps/web/src/auth.ts'),
  read('apps/web/src/owner.ts'),
  read('scripts/deploy-cloudflare.mjs'),
  read('apps/web/src/mirror.ts'),
  read('apps/web/src/admin-routes.ts'),
  read('apps/web/src/auth-routes.ts'),
  read('apps/web/src/ui.ts'),
  read('apps/web/src/client.ts'),
  read('apps/web/src/auth-challenge.ts'),
  read('apps/web/migrations/0008_auth_challenges.sql')
]);

const clientSource = client.match(/export const APP_JS = String\.raw`([\s\S]*)`;\s*$/)?.[1];
assert.ok(clientSource, 'client.ts must expose one static APP_JS template');
assert.doesNotThrow(() => new Function(clientSource), 'the JavaScript sent to browsers must parse successfully');

assert.match(wrangler, /workers_dev\s*=\s*false/, 'workers.dev must stay disabled');
assert.match(wrangler, /keep_vars\s*=\s*true/, 'dashboard variables must survive deploys');
assert.equal((wrangler.match(/custom_domain\s*=\s*true/g) ?? []).length, 2, 'exactly two static custom domains are allowed');
assert.match(wrangler, /pattern\s*=\s*"lunarlab\.uk"/);
assert.match(wrangler, /pattern\s*=\s*"20100823\.xyz"/);
assert.doesNotMatch(wrangler, /pattern\s*=\s*"[^"\n]*\*/, 'wildcard routes are forbidden');
assert.doesNotMatch(wrangler, /^\[vars\]/m, 'runtime variables must not be committed to wrangler.toml');
assert.doesNotMatch(wrangler, /CF_API_TOKEN|OWNER_PASSWORD|SESSION_SECRET|INVITE_CODE/, 'credentials must not appear in repository Wrangler config');

assert.match(provision, /workers_dev:\s*false/);
assert.match(provision, /keep_vars:\s*true/);
assert.match(provision, /allowedDomains = new Set\(\['lunarlab\.uk', '20100823\.xyz'\]\)/);
assert.match(provision, /new Set\(domains\)\.size !== 2/, 'duplicate deployment domains must be rejected');
assert.doesNotMatch(provision, /\bvars\s*:/, 'provisioning must not overwrite dashboard runtime variables');
assert.doesNotMatch(provision, /OWNER_PASSWORD|SESSION_SECRET|INVITE_CODE|CF_RUNTIME_API_TOKEN/, 'provisioning must never handle runtime credentials');

assert.match(index, /const ALLOWED_HOSTS = new Set\(\['lunarlab\.uk', '20100823\.xyz'\]\)/);
assert.match(index, /request\.clone\(\) as unknown as Request/, 'owner probing must clone and explicitly narrow the request type');
assert.match(index, /ownerAuthRoutes\(ownerRequest, env, path\)/, 'owner probing must not consume the member request body');
assert.match(index, /isMirrorHostname\(host\)/, 'mirror hosts must go through the dedicated D1-backed proxy path');
assert.doesNotMatch(index, /endsWith\(['"]\.20100823\.xyz/, 'homepage routing must never broadly accept arbitrary subdomains');
assert.match(index, /return asset\(APP_JS, 'text\/javascript; charset=utf-8'\)/, 'the browser must receive the checked-in client source directly');
assert.doesNotMatch(index, /MIRROR_CLIENT|ownerAware|mirrorAware|APP_JS\s*\.replace/, 'request-time source rewriting is forbidden');
assert.match(index, /path === '\/healthz'[\s\S]*?json\(\{ ok: true \}\)/, 'public health output must stay minimal');

assert.match(auth, /const SESSION_COOKIE = '__Host-cf_one_session'/);
assert.match(auth, /SameSite=Strict/);
assert.match(auth, /export async function readSession[\s\S]*?assertSessionSecret\(env\)/, 'session verification must fail closed without a strong signing value');
assert.match(auth, /SELECT email, role, status FROM users WHERE id = \?1/, 'protected requests must re-check current D1 account state');
assert.match(auth, /user\.status !== 'active'/, 'disabled users must lose access immediately');
assert.match(auth, /session\.sub === OWNER_ID && session\.email === OWNER_EMAIL/, 'owner identity must be fixed independently of editable user data');
assert.match(auth, /export async function requireOwner/, 'infrastructure actions need a separate owner gate');
assert.match(auth, /CREDENTIAL_SECRET/, 'password-verifier encryption must support a key independent from session signing');
assert.doesNotMatch(auth, /DEVICE_BINDING\s*===\s*'strict'[\s\S]{0,100}return null/, 'client-hint drift must never invalidate an otherwise valid session');

assert.match(authMigration, /CREATE TABLE IF NOT EXISTS auth_challenges/, 'login challenges need a strongly consistent D1 table');
assert.match(authChallenge, /DELETE FROM auth_challenges[\s\S]*RETURNING/, 'login challenges must be atomically consumed once');
assert.match(authRoutes, /storeAuthChallenge/, 'member challenges must be stored in D1');
assert.match(authRoutes, /consumeAuthChallenge/, 'member challenges must be atomically consumed from D1');
assert.doesNotMatch(authRoutes, /auth:challenge|CACHE\.(?:get|put|delete)/, 'member login handshakes must not depend on eventually consistent KV');
assert.match(authRoutes, /VALUES \(\?1, \?2, \?3, 'member', 'active'\)/, 'new member registration must never self-promote');
assert.doesNotMatch(authRoutes, /ADMIN_EMAILS|USER_ALLOWLIST/, 'member roles must come from D1 rather than environment allowlists');
assert.match(authRoutes, /__Host-cf_one_session=\$\{token\}/, 'synthetic session checks must use the actual host-only cookie name');

assert.match(owner, /INSERT INTO users/);
assert.match(owner, /ON CONFLICT\(id\) DO UPDATE/, 'owner login must repair its D1 identity');
assert.match(owner, /__Host-cf_one_session=/);
assert.match(owner, /\^\[A-Za-z0-9_-\]\{24\}\$/, 'owner challenge identifiers must have an exact format');
assert.match(owner, /const OWNER_ITERATIONS = 100_000;/, 'owner PBKDF2 must stay within the Cloudflare Workers 100,000-iteration limit');
assert.doesNotMatch(owner, /OWNER_ITERATIONS\s*=\s*(?:1[0-9]{5,}|[2-9][0-9]{5,})/, 'owner PBKDF2 must never exceed the Workers runtime limit');
assert.match(owner, /storeAuthChallenge/, 'owner challenges must be stored in D1');
assert.match(owner, /consumeAuthChallenge/, 'owner challenges must be atomically consumed from D1');
assert.doesNotMatch(owner, /owner:challenge|CACHE\.(?:get|put|delete)/, 'owner login handshakes must not depend on eventually consistent KV');

assert.match(mirror, /const MIRROR_ZONE = '20100823\.xyz'/);
assert.match(mirror, /const MIRROR_SERVICE = 'cf-one-apex'/);
assert.match(mirror, /\^m\[1-9\]\[0-9\]\*\\\.20100823\\\.xyz\$/i, 'only numbered mN mirror hostnames may enter the mirror host path');
assert.match(mirror, /workers\/domains/, 'mirror provisioning must use exact Worker Custom Domains');
assert.match(mirror, /allocateAndAttach/, 'mirror allocation must atomically allocate then attach an exact hostname');
assert.doesNotMatch(mirror, /\/zones\?name=|dns_records\?name=/, 'mirror allocation must not require broad zone or DNS read permissions');
assert.match(mirror, /domainConflict/, 'provider-side hostname conflicts must be skipped without overwriting existing names');
assert.match(mirror, /detachDomainById/, 'failed persistence must be able to compensate by detaching the just-created domain');
assert.match(mirror, /mirror\.domain-provider/, 'provider failures need server-side diagnostics');
assert.doesNotMatch(mirror, /console\.error\([^\n]*(?:CF_API_TOKEN|authorization|Bearer)/i, 'provider diagnostics must never log credentials');
assert.doesNotMatch(mirror, /\*\.20100823\.xyz|pattern.*\*/, 'mirror provisioning must never create a wildcard route');

assert.match(admin, /ownerOnly\(session\)/, 'infrastructure and role management must enforce the owner boundary');
assert.match(admin, /cloudflareApiConfigured:\s*Boolean\(env\.CF_API_TOKEN\)/, 'status may expose only whether the token is configured');
assert.doesNotMatch(admin, /accountId:\s*env\.CF_ACCOUNT_ID|slice\(0,\s*6\).*CF_ACCOUNT_ID/, 'status must not return even a truncated configured account value');
assert.doesNotMatch(admin, /json\([^\n]*CF_API_TOKEN|json\([^\n]*OWNER_PASSWORD|json\([^\n]*SESSION_SECRET|json\([^\n]*INVITE_CODE/, 'credential values must never be serialized into API responses');

assert.match(ui, /data-theme="system"/, 'the shell must support a system-aware theme');
assert.match(ui, /prefers-color-scheme:dark/, 'dark mode must follow the OS when using system mode');
assert.match(ui, /<html[^>]*style="--accent:/, 'theme accent must live on the root element so root design tokens can resolve it');
assert.match(ui, /bottom-navigation/, 'small screens need touch-first navigation');
assert.doesNotMatch(ui, /navigation-rail/, 'desktop navigation must not depend on a fixed side rail');
assert.match(ui, /\[hidden\]\{display:none!important\}/, 'the hidden attribute must not be overridden by component display rules');
assert.match(ui, /body\.is-admin \[data-admin-only\]\{display:flex!important\}/, 'admin-only navigation and cards must restore their native flex layout');
assert.doesNotMatch(ui, /margin-left:max\(/, 'desktop content positioning must not use fragile rail-offset arithmetic');
assert.doesNotMatch(ui, /backdrop-filter/, 'the primary app shell must not require expensive blur effects to remain legible');
assert.doesNotMatch(ui, /Cloudflare edge|Durable Objects|SCOPED TOKEN|OWNER ONLY|INBOX \/ R2|MIRROR_TARGETS|Custom Domain|PBKDF2/, 'implementation details must not be used as public product copy');
assert.match(client, /api\("\/api\/mirror\/targets"/, 'mirror UI must call the real self-service API directly');
assert.doesNotMatch(client, /window\.confirm|\bconfirm\(/, 'destructive actions must use the in-app confirmation dialog');
assert.doesNotMatch(client, /Cloudflare 资源|D1 \/ KV \/ R2|MIRROR_TARGETS|PBKDF2 密钥|Custom Domain|P1/, 'client-visible copy must not expose implementation details');
assert.doesNotMatch(client, /JSON\.stringify\(await api\("\/api\/admin\//, 'admin UI must not dump raw internal API responses');

assert.doesNotMatch(deploy, /secret.*bulk|runtimeSecrets|SESSION_SECRET|OWNER_PASSWORD|INVITE_CODE|CF_RUNTIME_API_TOKEN/i, 'deploy must not read or rewrite dashboard credentials');
assert.doesNotMatch(deploy, /console\.log\([^)]*process\.env/i, 'deployment logs must not interpolate environment credentials');

console.log('security regression checks passed');
