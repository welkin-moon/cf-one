# cf-one

Cloudflare-first personal web platform for `lunarlab.uk/*` and `20100823.xyz/*`.

## Included scaffold

- site-wide navigation and utility APIs;
- signed cookie sessions plus a privacy-preserving device risk signal;
- friends-only chat rooms and a small social feed backed by D1;
- inbound email archiving with Email Routing + R2;
- owner-only Cloudflare zone/DNS read APIs using a scoped API token;
- an allowlisted reverse proxy for origins you own or are authorized to proxy;
- installable PWA manifest and web-app catalog foundation.

The security defaults are intentional: this is not an open proxy, Cloudflare account-global keys are not accepted, fingerprinting is never sufficient to log in, and the PWA module does not use iOS exploits.

## Stack

- Cloudflare Workers for routing and APIs
- D1 for users, chat, posts, mail metadata, and audit logs
- KV for short-lived cache/rate-limit state
- R2 for attachments, media, and raw inbound mail
- Email Routing for inbound mail

## Start

```bash
corepack enable
pnpm install
cp .dev.vars.example apps/web/.dev.vars
pnpm db:migrate:local
pnpm dev
```

Create D1/KV/R2 resources, replace the placeholder IDs in `apps/web/wrangler.toml`, then add secrets:

```bash
cd apps/web
pnpm wrangler secret put SESSION_SECRET
pnpm wrangler secret put INVITE_CODE
pnpm wrangler secret put CF_API_TOKEN
```

Use a narrowly scoped Cloudflare API token. Do not paste a Global API Key into this project.

See `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/ROADMAP.md`.
