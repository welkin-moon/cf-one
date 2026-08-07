import { spawn } from 'node:child_process';
import path from 'node:path';

const { outputPath } = await import('./provision-cloudflare.mjs');
const webDirectory = path.dirname(outputPath);

function run(arguments_, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'wrangler', ...arguments_], {
      cwd: webDirectory,
      env: process.env,
      stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit'
    });
    if (input) child.stdin.end(input);
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`wrangler ${arguments_.join(' ')} exited with ${code}`)));
  });
}

await run(['d1', 'migrations', 'apply', process.env.CF_ONE_D1_NAME?.trim() || 'cf-one', '--remote', '--config', 'wrangler.generated.jsonc']);
await run(['deploy', '--config', 'wrangler.generated.jsonc']);

const runtimeSecrets = {};
for (const name of ['SESSION_SECRET', 'INVITE_CODE', 'OWNER_PASSWORD']) {
  if (process.env[name]) runtimeSecrets[name] = process.env[name];
}
if (process.env.CF_RUNTIME_API_TOKEN) runtimeSecrets.CF_API_TOKEN = process.env.CF_RUNTIME_API_TOKEN;
if (Object.keys(runtimeSecrets).length) {
  await run(['secret', 'bulk', '--config', 'wrangler.generated.jsonc'], `${JSON.stringify(runtimeSecrets)}\n`);
  console.log('cf-one-apex deployed; build-provided runtime secrets were synchronized.');
} else {
  console.log('cf-one-apex deployed; existing runtime secrets were preserved by keep_vars.');
}
