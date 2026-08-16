import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const webDirectory = path.join(rootDirectory, 'apps/web');

function runWrangler(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'wrangler', ...arguments_], {
      cwd: webDirectory,
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

async function apiForm(endpoint, form) {
  const response = await fetch(`${apiRoot}${endpoint}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    body: form
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const errors = body?.errors?.map(error => `${error.code ?? 'unknown'}: ${error.message ?? 'Cloudflare API error'}`).join('; ');
    throw new Error(`Cloudflare API ${response.status} for ${endpoint}${errors ? `: ${errors}` : ''}`);
  }
  return body.result;
}

async function findJavaScript(directory) {
  const found = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) found.push(full);
    }
  }
  await walk(directory);
  if (found.length !== 1) {
    throw new Error(`Expected one bundled JavaScript module from mf01sm dry-run, found ${found.length}: ${found.join(', ')}`);
  }
  return found[0];
}

const outDirectory = await mkdtemp(path.join(os.tmpdir(), 'mf01sm-runtime-'));
try {
  await runWrangler([
    'deploy',
    '--dry-run',
    '--cwd', '../mf01sm',
    '--config', 'wrangler.toml',
    '--name', 'mf01sm',
    '--outdir', outDirectory
  ]);

  const bundlePath = await findJavaScript(outDirectory);
  const source = await readFile(bundlePath, 'utf8');
  if (!source.includes('3.7.0') || !source.includes('assigned-sex-v3.7-balanced-sm-fantasy') || !source.includes('mixed-v37-sm-fantasy') || !source.includes('gender_style_masc') || !source.includes('gender_style_fem') || !source.includes('initiative01') || !source.includes('dominance') || !source.includes('s_like') || !source.includes('m_like') || !source.includes('mf01sm-v37-age-gate') || !source.includes('q.reverse?6-raw:raw') || !source.includes('sexual_attraction_direction') || !source.includes('返回 Test 首页') || !source.includes('gender_identity_special') || !source.includes('questionnaire schema/version mismatch') || !source.includes('run_thresholds') || !source.includes('response_quality_detail') || !source.includes('CF-Connecting-IP')) {
    throw new Error('mf01sm runtime bundle is missing v3.7.0 S/M-like fantasy integrity markers; refusing to deploy.');
  }

  const scriptName = 'mf01sm';
  const settings = await api(`/accounts/${accountId}/workers/scripts/${scriptName}/settings`);
  const bindingNames = Array.isArray(settings?.bindings) ? settings.bindings.map(binding => String(binding?.name || '')).filter(Boolean) : [];
  if (!bindingNames.includes('mf01sm') || !bindingNames.includes('mf01smsql') || !bindingNames.includes('ADMIN')) {
    throw new Error('mf01sm historical bindings are incomplete; refusing to deploy runtime bundle.');
  }

  const metadata = {
    main_module: 'worker.js',
    compatibility_date: settings?.compatibility_date || '2026-05-07',
    compatibility_flags: settings?.compatibility_flags || [],
    bindings: bindingNames.map(name => ({ type: 'inherit', name, version_id: 'latest' })),
    annotations: {
      'workers/tag': `mf01sm-v3.7.0-${Date.now().toString(36)}`,
      'workers/message': 'mf01sm v3.7.0 16plus consensual hypothetical S-M-like runtime'
    }
  };

  const form = new FormData();
  form.set('metadata', JSON.stringify(metadata));
  form.set('worker.js', new Blob([source], { type: 'application/javascript+module' }), 'worker.js');
  const version = await apiForm(`/accounts/${accountId}/workers/scripts/${scriptName}/versions?bindings_inherit=strict`, form);
  if (!version?.id) throw new Error('Cloudflare uploaded mf01sm runtime but returned no version id.');

  const deployment = await api(`/accounts/${accountId}/workers/scripts/${scriptName}/deployments`, {
    method: 'POST',
    body: JSON.stringify({
      strategy: 'percentage',
      versions: [{ percentage: 100, version_id: version.id }],
      annotations: { 'workers/message': 'mf01sm v3.7.0 16plus consensual hypothetical S-M-like runtime' }
    })
  });
  if (!deployment?.id) throw new Error('Cloudflare created no mf01sm runtime deployment id.');
  console.log(`mf01sm v3.7.0 runtime ${version.id} deployed at 100%; 16+ age gate, separate S-like/M-like hypothetical scores, nonsexual personality dimensions and historical storage behavior are active.`);
} finally {
  await rm(outDirectory, { recursive: true, force: true });
}
