# Architecture

## Request path and domain profiles

Both Custom Domains invoke one module Worker. `siteProfile()` selects the name, theme, navigation, and enabled features from the request hostname. Defaults make `lunarlab.uk` the full private workspace and `20100823.xyz` the lighter personal index; `SITE_CONFIG` can override either without a code fork.

Routes:

- `/`, `/app/*`, `/assets/*`: server shell and dependency-free browser client;
- `/api/auth/*`: one-time challenges, registration/login, session status, and logout;
- `/api/chat/*`: rooms, membership, and messages;
- `/api/social/*`: friendships, posts, feed, and likes;
- `/api/tools/*`: bounded stateless tools;
- `/api/mail/*`: archived inbound mail and restricted outbound send;
- `/api/admin/*`: status, resource inventory, and managed-zone DNS;
- `/mirror/:alias/*`: owner-only, allowlisted HTTPS mirror.

The router checks each API against the current domain's enabled feature list, so hiding a navigation item is not the security boundary.

## Storage

- D1 stores users, encrypted credential verifiers, device observations, friends, chat, posts, mail metadata, and audit events.
- R2 stores raw email and later media/attachments.
- KV stores only expiring login challenges and coarse IP login counters. Keeping ordinary product state out of KV preserves its small free write quota.

## Authentication

The Workers Free CPU budget is 10 ms, so the Worker does not run an expensive password KDF. Instead:

1. the Worker returns a random, expiring challenge and account salt;
2. the browser derives a 256-bit verifier with PBKDF2-SHA-256;
3. the browser signs the challenge with that verifier;
4. the Worker verifies the proof with fast Web Crypto operations;
5. the verifier is encrypted with an AES-GCM key derived from `SESSION_SECRET` before it is stored in D1.

Successful login produces a two-week HMAC-signed, HttpOnly, Secure, SameSite=Lax cookie. A per-session CSRF token is returned to the same-origin browser client. A coarse HMAC device value may warn or require reauthentication, but cannot log in by itself.

## Realtime plan

v0.1 polls the selected room every 12 seconds only while the page is visible. This is simple and fits a small friends-only deployment. The next realtime step is one SQLite-backed Durable Object per room plus the WebSocket Hibernation API. That design is available on Workers Free, but should be added with quota telemetry rather than assumed to be unlimited.

## Email

The Worker's `email()` handler streams RFC822 content into R2 and writes metadata into D1. `MAIL_RECIPIENTS` can reject unknown addresses.

The optional `send_email` binding is generated only when explicitly enabled. On Workers Free it is restricted to `EMAIL_DESTINATIONS`, which must already be verified in the Cloudflare account.

## Provisioning

`scripts/provision-cloudflare.mjs` uses the Cloudflare REST API to find or create one D1 database, one KV namespace, and one R2 bucket. It writes `wrangler.generated.jsonc`, which is ignored by Git. `scripts/deploy-cloudflare.mjs` applies migrations, deploys through Wrangler, and streams runtime secrets to `wrangler secret bulk` over stdin.

The broad provisioning token remains a Workers Build secret. The optional runtime Cloudflare token is a separate, narrower secret.
