import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFile(path.join(root, relative), 'utf8');

const [wrangler, provision, index, auth, owner, deploy] = await Promise.all([
  read('apps/web/wrangler.toml'),
  read('scripts/provision-cloudflare.mjs'),
  read('apps/web/src/index.ts'),
  read('apps/web/src/auth.ts'),
  read('apps/web/src/owner.ts'),
  read('scripts/deploy-cloudflare.mjs')
]);

assert.match(wrangler, /workers_dev\s*=\s*false/, 'workers.dev must stay disabled');
assert.equal((wrangler.match(/custom_domain\s*=\s*true/g) ?? []).length, 2, 'exactly two custom domains are allowed');
assert.match(wrangler, /pattern\s*=\s*"lunarlab\.uk"/);
assert.match(wrangler, /pattern\s*=\s*"20100823\.xyz"/);
assert.doesNotMatch(wrangler, /pattern\s*=\s*"[^"\n]*\*/, 'wildcard routes are forbidden');

assert.match(provision, /workers_dev:\s*false/);
assert.match(provision, /allowedDomains = new Set\(\['lunarlab\.uk', '20100823\.xyz'\]\)/);
assert.match(provision, /new Set\(domains\)\.size !== 2/, 'duplicate domain entries must be rejected');
assert.match(provision, /MANAGED_ZONES:\s*domains\.join\(','\)/, 'admin zone scope must follow the two deployment domains');
assert.match(provision, /OWNER_USERNAME:\s*'admin'/, 'the highest-privilege username must stay fixed as admin');

assert.match(index, /const ALLOWED_HOSTS = new Set\(\['lunarlab\.uk', '20100823\.xyz'\]\)/);
assert.match(index, /request\.clone\(\) as unknown as Request/, 'owner probing must clone and explicitly narrow the request type');
assert.match(index, /ownerAuthRoutes\(ownerRequest, env, path\)/, 'owner probing must not consume the member request body');
assert.doesNotMatch(index, /endsWith\(['"]\.20100823\.xyz/, 'subdomains must never be accepted by the homepage Worker');

assert.match(auth, /const SESSION_COOKIE = '__Host-cf_one_session'/);
assert.match(auth, /SameSite=Strict/);
assert.match(auth, /export async function readSession[\s\S]*?assertSessionSecret\(env\)/, 'session verification must fail closed without a strong secret');
assert.match(auth, /session\.sub === OWNER_ID && session\.email === OWNER_EMAIL/, 'owner authorization must not depend on an editable email allowlist');

assert.match(owner, /INSERT INTO users/);
assert.match(owner, /ON CONFLICT\(id\) DO UPDATE/, 'owner login must repair its D1 identity');
assert.match(owner, /__Host-cf_one_session=/);
assert.match(owner, /\^\[A-Za-z0-9_-\]\{24\}\$/, 'owner challenge identifiers must have an exact format');

for (const secret of ['SESSION_SECRET', 'INVITE_CODE', 'OWNER_PASSWORD']) {
  assert.match(deploy, new RegExp(`['"]${secret}['"]`), `${secret} must be required and uploaded`);
}
assert.doesNotMatch(deploy, /console\.log\([^)]*process\.env/i, 'deployment logs must not interpolate environment secrets');
assert.doesNotMatch(deploy, /console\.log\([^)]*JSON\.stringify\(runtimeSecrets\)/i, 'deployment logs must not serialize runtime secrets');

console.log('security regression checks passed');
