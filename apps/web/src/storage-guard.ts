import type { Env } from './env';
import { readSession } from './auth';
import { HttpError } from './http';

function anonymousKey(request: Request): string {
  const address = request.headers.get('cf-connecting-ip')?.trim();
  return `anon:${address && address.length <= 64 ? address : 'unknown'}`;
}

export async function guardStorageRequest(request: Request, env: Env): Promise<void> {
  // readSession verifies the signed cookie without consulting D1, so abusive
  // storage requests can be rejected before account and storage SQL is reached.
  const session = await readSession(request, env);
  const userKey = session ? `user:${session.sub}` : anonymousKey(request);
  const [user, global] = await Promise.all([
    env.STORAGE_USER_RATE_LIMITER.limit({ key: userKey }),
    env.STORAGE_GLOBAL_RATE_LIMITER.limit({ key: 'storage-api' })
  ]);
  if (!user.success || !global.success) throw new HttpError(429, 'storage request rate limit reached; try again shortly');
}
