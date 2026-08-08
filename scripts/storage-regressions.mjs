import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFile(path.join(root, relative), 'utf8');
const [migration, guardMigration, storage, storageGuard, config, index, ui, client, env, wrangler, provision] = await Promise.all([
  read('apps/web/migrations/0009_google_drive_storage.sql'),
  read('apps/web/migrations/0010_storage_guardrails.sql'),
  read('apps/web/src/storage.ts'),
  read('apps/web/src/storage-guard.ts'),
  read('apps/web/src/config.ts'),
  read('apps/web/src/index.ts'),
  read('apps/web/src/ui.ts'),
  read('apps/web/src/client.ts'),
  read('apps/web/src/env.ts'),
  read('apps/web/wrangler.toml'),
  read('scripts/provision-cloudflare.mjs')
]);

assert.match(migration, /default_quota_bytes INTEGER NOT NULL DEFAULT 10737418240/, 'new users need a finite default quota');
assert.match(migration, /CREATE TABLE IF NOT EXISTS user_storage_quotas/, 'per-user quota overrides must be stored in D1');
assert.match(migration, /CREATE TABLE IF NOT EXISTS storage_uploads/, 'in-flight uploads must reserve quota');
assert.match(migration, /CREATE TABLE IF NOT EXISTS storage_oauth_states/, 'OAuth state must be server-side and expiring');
assert.match(migration, /client_secret_box/, 'the Google OAuth client secret must be encrypted at rest');

assert.match(guardMigration, /total_quota_bytes INTEGER NOT NULL DEFAULT 4398046511104/, 'global storage must have a finite guardrail by default');
assert.match(guardMigration, /provider_headroom_bytes INTEGER NOT NULL DEFAULT 53687091200/, 'the connected Google account must retain safety headroom');
assert.match(guardMigration, /default_daily_relay_bytes INTEGER NOT NULL DEFAULT 21474836480/, 'each user needs a finite daily relay budget');
assert.match(guardMigration, /total_daily_relay_bytes INTEGER NOT NULL DEFAULT 214748364800/, 'the site needs a finite daily relay budget');
assert.match(guardMigration, /default_file_count_limit INTEGER NOT NULL DEFAULT 5000/, 'per-user file index growth must be bounded');
assert.match(guardMigration, /total_file_count_limit INTEGER NOT NULL DEFAULT 50000/, 'global D1 file index growth must be bounded');
assert.match(guardMigration, /CREATE TABLE IF NOT EXISTS storage_traffic_daily/, 'traffic accounting must aggregate by user and day');
assert.match(guardMigration, /PRIMARY KEY \(day, user_id\)/, 'traffic accounting must use one bounded aggregate row per user/day');
assert.match(guardMigration, /CREATE TABLE IF NOT EXISTS user_storage_transfer_limits/, 'admins need per-user transfer overrides');

assert.match(storage, /https:\/\/www\.googleapis\.com\/auth\/drive\.file/, 'Google Drive must use the narrow drive.file scope');
assert.doesNotMatch(storage, /auth\/drive['"]/, 'full-drive OAuth scope must not be requested');
assert.match(storage, /access_type:\s*'offline'/, 'Drive connection must request offline access');
assert.match(storage, /prompt:\s*'consent'/, 'Drive reconnect must be able to obtain a refresh token');
assert.match(storage, /DELETE FROM storage_oauth_states[\s\S]*RETURNING state/, 'OAuth state must be consumed exactly once');
assert.match(storage, /sealStorage\(clientSecret/, 'OAuth client secrets must be encrypted before D1 persistence');
assert.match(storage, /sealStorage\(refreshToken/, 'refresh tokens must be encrypted before D1 persistence');
assert.doesNotMatch(storage, /console\.(?:log|error|warn)\([^\n]*(?:access_token|refresh_token|client_secret|authorization)/i, 'Google credentials must never be logged');
assert.doesNotMatch(storage, /[?&]access_token=/, 'download URLs must never expose OAuth access tokens');

assert.match(storage, /storage quota exceeded; contact an administrator/, 'per-user quota failures must require administrator handling');
assert.match(storage, /global storage capacity guard reached; contact an administrator/, 'global storage exhaustion must fail closed');
assert.match(storage, /Google storage capacity guard reached; contact an administrator/, 'provider capacity exhaustion must fail closed');
assert.match(storage, /INSERT INTO storage_uploads[\s\S]*policy\.total_quota_bytes/, 'quota reservation must enforce the global storage cap atomically');
assert.match(storage, /default_file_count_limit[\s\S]*total_file_count_limit/, 'upload reservation must enforce bounded D1 file indexes');
assert.match(storage, /MAX_ACTIVE_UPLOADS_PER_USER = 8/, 'active upload sessions must stay bounded');
assert.match(storage, /DEFAULT_CHUNK_BYTES = 16 \* 1024 \* 1024/, 'browser uploads must use bounded chunks with reduced D1 write amplification');
assert.match(storage, /GOOGLE_CHUNK_UNIT = 256 \* 1024/, 'non-final Drive chunks must respect Google resumable-upload alignment');
assert.match(storage, /uploadType=resumable/, 'uploads must use Drive resumable sessions');
assert.match(storage, /content-range/, 'resumable upload chunks must carry Content-Range');
assert.match(storage, /\/about\?fields=/, 'uploads must be able to inspect the connected account storage quota');
assert.match(storage, /provider_headroom_bytes/, 'provider quota checks must retain configured headroom');

assert.match(storage, /INSERT INTO storage_traffic_daily/, 'relay transfers must reserve traffic before forwarding bytes');
assert.match(storage, /daily relay traffic limit reached; contact an administrator/, 'traffic exhaustion must require administrator handling');
assert.match(storage, /total_daily_relay_bytes/, 'global relay bytes must be enforced');
assert.match(storage, /total_daily_relay_requests/, 'global relay request counts must be enforced');
assert.match(storage, /refundTrafficBytes/, 'failed upstream transfers must not permanently consume byte quota');
assert.doesNotMatch(storage, /CACHE\.(?:get|put|delete)/, 'storage traffic accounting must not amplify KV writes');
assert.match(storage, /MAX_DAILY_RELAY_BYTES = 900 \* 1024 \* 1024 \* 1024/, 'admin policy must keep a hard ceiling below the Drive API 1 TB/day egress threshold');

assert.match(storageGuard, /readSession\(request, env\)/, 'the burst gate must authenticate a signed session without querying D1');
assert.match(storageGuard, /STORAGE_USER_RATE_LIMITER\.limit/, 'storage requests need a per-user burst limiter');
assert.match(storageGuard, /STORAGE_GLOBAL_RATE_LIMITER\.limit/, 'storage requests need a global burst limiter');
assert.doesNotMatch(storageGuard, /\.DB\.|\.CACHE\./, 'the burst gate must not consume D1 or KV quota');
assert.match(index, /guardStorageRequest\(request, env\)[\s\S]*storageRoutes\(request, env, path\)/, 'storage burst limiting must happen before storage SQL/API routing');
assert.match(env, /STORAGE_USER_RATE_LIMITER: RateLimiterBinding/, 'Worker env needs the per-user rate limiter binding');
assert.match(env, /STORAGE_GLOBAL_RATE_LIMITER: RateLimiterBinding/, 'Worker env needs the global rate limiter binding');
assert.match(wrangler, /name = "STORAGE_USER_RATE_LIMITER"[\s\S]*limit = 180[\s\S]*period = 60/, 'checked-in config needs a finite per-user burst limit');
assert.match(wrangler, /name = "STORAGE_GLOBAL_RATE_LIMITER"[\s\S]*limit = 3000[\s\S]*period = 60/, 'checked-in config needs a finite global burst limit');
assert.match(provision, /STORAGE_USER_RATE_LIMITER[\s\S]*2010082301[\s\S]*limit: 180, period: 60/, 'generated production config must preserve the per-user rate limiter');
assert.match(provision, /STORAGE_GLOBAL_RATE_LIMITER[\s\S]*2010082302[\s\S]*limit: 3000, period: 60/, 'generated production config must preserve the global rate limiter');

assert.match(storage, /\?alt=media/, 'Worker downloads must use Drive media download');
assert.match(storage, /for \(const name of \['range', 'if-range'/, 'Worker relay must preserve byte-range download semantics');
assert.match(storage, /via === 'google'/, 'users must be able to choose Google-direct downloads');
assert.match(storage, /drive\.google\.com\/uc\?export=download/, 'direct mode must hand off to Google without credentials');
assert.match(storage, /via !== 'worker'/, 'Worker relay must be an explicit transfer mode');
assert.match(storage, /requestedDownloadBytes/, 'range downloads must reserve only the expected transfer size when possible');

assert.doesNotMatch(config, /'chat'|'social'/, 'OpenX chat/social features must not be activatable in LMS');
assert.doesNotMatch(index, /api\/chat|api\/social/, 'OpenX APIs must not be mounted in LMS');
assert.doesNotMatch(ui, /\/app\/chat|\/app\/social|聊天|动态/, 'OpenX product surfaces must not remain in LMS navigation or copy');
assert.doesNotMatch(client, /renderChat|renderSocial|\/api\/chat|\/api\/social/, 'OpenX client implementation must not ship in the LMS bundle');
assert.match(config, /'files'/, 'files must be a first-class LMS feature');
assert.match(index, /storageRoutes/, 'storage API must be mounted through the files feature');
assert.match(client, /\/api\/storage\/uploads/, 'the file UI must use the resumable storage API');
assert.match(client, /lms-drive-route/, 'the user must be able to remember a preferred transfer path');
assert.match(client, /存储防护/, 'owner UI must expose global protection settings');
assert.match(client, /dailyRelayBytes/, 'admin UI must expose per-user relay traffic limits');
assert.match(client, /今日中转/, 'users must be able to see their daily relay consumption');

console.log('Storage regressions passed.');
