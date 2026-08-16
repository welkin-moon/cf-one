import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const { outputPath } = await import('./provision-cloudflare.mjs');
const webDirectory = path.dirname(outputPath);

function run(arguments_, cwd = webDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'wrangler', ...arguments_], {
      cwd,
      env: process.env,
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`wrangler ${arguments_.join(' ')} exited with ${code}`)));
  });
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token) {
  throw new Error('Cloudflare build credentials are unavailable.');
}

const apiRoot = 'https://api.cloudflare.com/client/v4';

async function api(endpoint, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`${apiRoot}${endpoint}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const errors = body?.errors?.map(error => `${error.code ?? 'unknown'}: ${error.message ?? 'Cloudflare API error'}`).join('; ');
    throw new Error(`Cloudflare API ${response.status} for ${endpoint}${errors ? `: ${errors}` : ''}`);
  }
  return body.result;
}

function queryRows(result) {
  if (!Array.isArray(result)) return [];
  return result.flatMap(entry => Array.isArray(entry?.results) ? entry.results : []);
}

async function d1Query(databaseId, sql, params = []) {
  return api(`/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({ sql, params })
  });
}

async function reconcileMirrorDomains(config) {
  const databaseId = config?.d1_databases?.find(binding => binding?.binding === 'DB')?.database_id;
  const workerName = config?.name;
  if (!databaseId || !workerName) throw new Error('Generated Wrangler config is missing DB or Worker identity.');

  const active = queryRows(await d1Query(databaseId, `SELECT id, hostname, domain_id
    FROM mirror_targets WHERE state = 'active' ORDER BY created_at ASC LIMIT 100`));
  let repaired = 0;

  for (const row of active) {
    const hostname = String(row?.hostname ?? '').trim().toLowerCase();
    if (!/^m[1-9][0-9]*\.20100823\.xyz$/.test(hostname)) {
      throw new Error(`Refusing to reconcile unexpected active mirror hostname: ${hostname || '(empty)'}`);
    }

    const listed = await api(`/accounts/${accountId}/workers/domains?hostname=${encodeURIComponent(hostname)}`);
    const exact = Array.isArray(listed) ? listed.find(domain => String(domain?.hostname ?? '').toLowerCase() === hostname) : null;
    if (exact) {
      if (exact.service !== workerName) {
        throw new Error(`Mirror hostname ${hostname} is attached to another Worker; refusing to overwrite it.`);
      }
      if (exact.id && exact.id !== row.domain_id) {
        await d1Query(databaseId, 'UPDATE mirror_targets SET domain_id = ?1 WHERE id = ?2', [exact.id, row.id]);
      }
      continue;
    }

    const attached = await api(`/accounts/${accountId}/workers/domains`, {
      method: 'PUT',
      body: JSON.stringify({ hostname, service: workerName })
    });
    if (!attached?.id) throw new Error(`Cloudflare attached ${hostname} but returned no domain id.`);
    await d1Query(databaseId, 'UPDATE mirror_targets SET domain_id = ?1 WHERE id = ?2', [attached.id, row.id]);
    repaired++;
    console.log(`Reattached active mirror domain ${hostname}.`);
  }

  console.log(`Mirror-domain reconciliation complete: ${active.length} active, ${repaired} repaired.`);
}

await run(['d1', 'migrations', 'apply', process.env.CF_ONE_D1_NAME?.trim() || 'cf-one', '--remote', '--config', 'wrangler.generated.jsonc']);
const generatedConfig = JSON.parse(await readFile(outputPath, 'utf8'));
await reconcileMirrorDomains(generatedConfig);

// mf01sm is intentionally NOT uploaded here. v3.8 has one authoritative deployment path:
// scripts/deploy-mf01sm-runtime.mjs. This removes the old intermediate core version/deployment
// and its extra settings/upload/deployment API calls.

// Code/config versions and traffic deployments are deliberately separated from Worker triggers.
// `wrangler deploy` synchronizes configured routes/custom domains, which can delete API-created
// mN.20100823.xyz mirror domains because those dynamic hostnames are intentionally absent from
// the checked-in config. `versions upload` + `versions deploy` updates the Worker version without
// touching routes/domains. Trigger changes must be performed explicitly with `wrangler triggers
// deploy` during infrastructure maintenance.
const versionTag = `cf-one-${Date.now().toString(36)}`;
await run(['versions', 'upload', '--config', 'wrangler.generated.jsonc', '--tag', versionTag, '--message', 'cf-one automated build']);
await run(['versions', 'deploy', '--config', 'wrangler.generated.jsonc', '--version-tag', versionTag, '--yes', '--message', 'cf-one automated build']);

console.log(`cf-one-apex version ${versionTag} deployed; Worker routes and Custom Domains were not synchronized, active mirror domains were reconciled from D1, and mf01sm is deployed only once by its dedicated flat-runtime deployer.`);
