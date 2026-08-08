import { spawn } from 'node:child_process';
import path from 'node:path';

const { outputPath } = await import('./provision-cloudflare.mjs');
const webDirectory = path.dirname(outputPath);

function run(arguments_) {
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

await run(['d1', 'migrations', 'apply', process.env.CF_ONE_D1_NAME?.trim() || 'cf-one', '--remote', '--config', 'wrangler.generated.jsonc']);

// Code/config versions and traffic deployments are deliberately separated from
// Worker triggers. `wrangler deploy` also synchronizes configured routes/custom
// domains, which can delete API-created mN.20100823.xyz mirror domains because
// those dynamic hostnames are intentionally absent from the checked-in config.
// `versions upload` + `versions deploy` updates the Worker version without
// touching routes/domains. Trigger changes must be performed explicitly with
// `wrangler triggers deploy` during infrastructure maintenance.
const versionTag = `cf-one-${Date.now().toString(36)}`;
await run(['versions', 'upload', '--config', 'wrangler.generated.jsonc', '--tag', versionTag, '--message', 'cf-one automated build']);
await run(['versions', 'deploy', '--config', 'wrangler.generated.jsonc', '--version-tag', versionTag, '--yes', '--message', 'cf-one automated build']);

console.log(`cf-one-apex version ${versionTag} deployed; Worker routes and Custom Domains were not synchronized, so API-created mirror domains are preserved.`);
