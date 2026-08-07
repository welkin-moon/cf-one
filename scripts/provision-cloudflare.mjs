import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'apps/web/wrangler.generated.jsonc');
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();

if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId)) {
  throw new Error('CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID.');
}
if (!token) throw new Error('CLOUDFLARE_API_TOKEN must be a scoped API Token (Global API Keys are not supported).');

const apiRoot = 'https://api.cloudflare.com/client/v4';

async function api(endpoint, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`${apiRoot}${endpoint}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const errors = body?.errors?.map(error => error.message).filter(Boolean).join('; ');
    throw new Error(`Cloudflare API ${response.status} for ${endpoint}${errors ? `: ${errors}` : ''}`);
  }
  return body.result;
}

async function ensureD1(name) {
  const existing = await api(`/accounts/${accountId}/d1/database?name=${encodeURIComponent(name)}&per_page=100`);
  const found = Array.isArray(existing) ? existing.find(database => database.name === name) : null;
  if (found) return found.uuid;
  const created = await api(`/accounts/${accountId}/d1/database`, { method: 'POST', body: JSON.stringify({ name }) });
  if (!created?.uuid) throw new Error('Cloudflare created D1 but did not return its UUID.');
  return created.uuid;
}

async function ensureKv(title) {
  const existing = await api(`/accounts/${accountId}/storage/kv/namespaces?per_page=100&order=title&direction=asc&page=1`);
  const found = Array.isArray(existing) ? existing.find(namespace => namespace.title === title) : null;
  if (found) return found.id;
  const created = await api(`/accounts/${accountId}/storage/kv/namespaces`, { method: 'POST', body: JSON.stringify({ title }) });
  if (!created?.id) throw new Error('Cloudflare created KV but did not return its ID.');
  return created.id;
}

async function ensureR2(name) {
  const existing = await api(`/accounts/${accountId}/r2/buckets`);
  const buckets = Array.isArray(existing) ? existing : existing?.buckets ?? [];
  const found = buckets.find(bucket => bucket.name === name);
  if (found) return found.name;
  const created = await api(`/accounts/${accountId}/r2/buckets`, { method: 'POST', body: JSON.stringify({ name }) });
  return created?.name ?? name;
}

const workerName = process.env.CF_ONE_WORKER_NAME?.trim() || 'cf-one-apex';
const databaseName = process.env.CF_ONE_D1_NAME?.trim() || 'cf-one';
const kvTitle = process.env.CF_ONE_KV_NAME?.trim() || 'cf-one-cache';
const bucketName = process.env.CF_ONE_R2_NAME?.trim() || 'cf-one-media';
const domains = (process.env.CF_ONE_DOMAINS || 'lunarlab.uk,20100823.xyz').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
const allowedDomains = new Set(['lunarlab.uk', '20100823.xyz']);

if (domains.length !== 2 || new Set(domains).size !== 2 || domains.some(domain => !allowedDomains.has(domain))) {
  throw new Error('CF_ONE_DOMAINS must contain exactly lunarlab.uk and 20100823.xyz. Subdomains are deliberately forbidden.');
}
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workerName)) throw new Error('CF_ONE_WORKER_NAME is invalid.');

const [databaseId, kvId, r2Bucket] = await Promise.all([ensureD1(databaseName), ensureKv(kvTitle), ensureR2(bucketName)]);
const configuredAdmins = (process.env.CF_ONE_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
const adminEmails = [...new Set(['admin@owner.local', ...configuredAdmins])].join(',');
const config = {
  $schema: '../../node_modules/wrangler/config-schema.json',
  name: workerName,
  main: 'src/index.ts',
  compatibility_date: '2026-07-21',
  workers_dev: false,
  keep_vars: true,
  routes: domains.map(pattern => ({ pattern, custom_domain: true })),
  d1_databases: [{ binding: 'DB', database_name: databaseName, database_id: databaseId, migrations_dir: 'migrations' }],
  kv_namespaces: [{ binding: 'CACHE', id: kvId }],
  r2_buckets: [{ binding: 'MEDIA', bucket_name: r2Bucket }],
  vars: {
    APP_NAME: process.env.CF_ONE_APP_NAME || 'Lunar Lab',
    OWNER_USERNAME: 'admin',
    ADMIN_EMAILS: adminEmails,
    USER_ALLOWLIST: process.env.CF_ONE_USER_ALLOWLIST || '',
    MAIL_RECIPIENTS: process.env.CF_ONE_MAIL_RECIPIENTS || '',
    EMAIL_DESTINATIONS: process.env.CF_ONE_EMAIL_DESTINATIONS || '',
    MANAGED_ZONES: domains.join(','),
    DEVICE_BINDING: process.env.CF_ONE_DEVICE_BINDING === 'strict' ? 'strict' : 'soft',
    MIRROR_TARGETS: process.env.CF_ONE_MIRROR_TARGETS || '{}',
    SITE_CONFIG: process.env.CF_ONE_SITE_CONFIG || '{}',
    CF_ACCOUNT_ID: accountId
  },
  observability: { enabled: true, head_sampling_rate: 1 }
};
if (process.env.CF_ONE_ENABLE_EMAIL_SEND === '1') {
  const destinations = (process.env.CF_ONE_EMAIL_DESTINATIONS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!destinations.length) throw new Error('CF_ONE_EMAIL_DESTINATIONS must list verified Cloudflare destination addresses when free-tier sending is enabled.');
  config.send_email = [{ name: 'EMAIL', allowed_destination_addresses: destinations, remote: true }];
}

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
console.log(`Prepared ${path.relative(root, outputPath)} for apex-only Worker ${workerName}; D1 ${databaseId}, KV ${kvId}, R2 ${r2Bucket}.`);

export { outputPath };
