import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const web = path.join(root, 'apps/web');
const out = await mkdtemp(path.join(os.tmpdir(), 'mf01sm-v405-stage-'));
const uploadUrl = 'https://mf01sm-v405-stage-mt3ta935.meteor-lab.workers.dev/upload-2d554a4e63874584a21f';

function run(cmd,args,cwd){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{cwd,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`${cmd} exited ${code}`)));});}
async function findJs(dir){const out=[];async function walk(d){for(const e of await readdir(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())await walk(f);else if(e.isFile()&&e.name.endsWith('.js'))out.push(f);}}await walk(dir);if(out.length!==1)throw new Error(`expected one Worker JS, got ${out.length}: ${out.join(', ')}`);return out[0];}

try {
  await run('git',['merge-base','--is-ancestor','5ad315fe623baa4b18bb38c4fe0694fd39d9ab90','HEAD'],root);
  await run('pnpm',['exec','wrangler','deploy','--dry-run','--cwd','../mf01sm','--config','wrangler.toml','--name','mf01sm','--outdir',out],web);
  const file=await findJs(out);
  const body=await readFile(file);
  const text=body.toString('utf8');
  for(const marker of ['4.0.5','cis-male-blue','cis-female-pink','sameSexAttraction','safe-area-inset-left','mf01sm-v4-history-2','mf01sm-v4-answers-1','locationRetry']) if(!text.includes(marker)) throw new Error(`bundle marker missing: ${marker}`);
  const sha=createHash('sha256').update(body).digest('hex');
  const response=await fetch(uploadUrl,{method:'POST',body,headers:{'content-type':'application/javascript'}});
  const reply=await response.json().catch(async()=>({raw:await response.text()}));
  if(!response.ok||!reply.ok||reply.bytes!==body.length||reply.sha256!==sha) throw new Error(`stage upload mismatch: ${response.status} ${JSON.stringify(reply)} local=${body.length}/${sha}`);
  console.log(`MF01SM_V405_STAGE bytes=${body.length} sha256=${sha}`);
} finally {
  await rm(out,{recursive:true,force:true});
}
