# cf-one

Cloudflare-first personal web platform for `lunarlab.uk` and `20100823.xyz`.

One Worker serves both hosts and selects a separate site profile for each request. The repository currently contains a usable v0.1 rather than a collection of placeholders:

- responsive navigation and per-domain feature profiles;
- private accounts, signed cookie sessions, CSRF protection, device-change signals, and browser-side password stretching;
- friends, a friends-only feed, likes, private posts, chat rooms, members, and persistent messages in D1;
- UUID, Base64, SHA-256, and JSON tools;
- inbound email archiving to R2 plus free-plan-safe sending to verified destinations;
- an owner-only Cloudflare resource/DNS console with managed-zone restrictions, confirmations, and audit records;
- an owner-only, server-allowlisted HTTPS mirror with redirect rewriting and isolated upstream cookies;
- an installable PWA and a standards-compliant catalog foundation for Apple Web Distribution.

## Deploy from Git

Connect this repository to a new Cloudflare Worker and use this deploy command:

```bash
pnpm cf:deploy
```

The command idempotently finds or creates the D1 database, KV namespace, and R2 bucket, writes an ephemeral Wrangler configuration, applies migrations, deploys the Worker to both custom domains, and uploads runtime secrets. Resource IDs and secrets are never committed.

At minimum, add these Cloudflare Workers Build variables/secrets:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
SESSION_SECRET
INVITE_CODE
CF_ONE_ADMIN_EMAILS
CF_ONE_USER_ALLOWLIST
```

Use a scoped API Token, not a Global API Key. `SESSION_SECRET` must remain stable and contain at least 32 random characters. See [Deployment](docs/DEPLOYMENT.md) for permissions, exact dashboard steps, domain settings, email routing, and all optional variables.

## Local development

```bash
corepack enable
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm db:migrate:local
pnpm dev
```

Checks:

```bash
pnpm typecheck
pnpm check
```

## Deliberate boundaries

- The mirror is not an open proxy. It accepts only server-configured HTTPS origins and admin sessions, and forces upstream documents into an opaque-origin sandbox. Some complex applications still need target-specific rewriting.
- Device characteristics are a risk signal, never a password or a hidden fingerprint-only account.
- Cloudflare Global API Keys are rejected. Provisioning and runtime administration use separate, scoped tokens.
- Workers Free can receive email, but arbitrary outbound recipients require Workers Paid. Free deployments are restricted to verified destination addresses.
- The iOS module supports PWA installation and Apple's official, notarized Web Distribution flow. It contains no exploit, enterprise-certificate abuse, or App Store bypass.
- Free-tier quotas are real limits. See [Free-tier budget](docs/FREE_TIER.md).

More detail: [Architecture](docs/ARCHITECTURE.md), [Security](docs/SECURITY.md), and [Roadmap](docs/ROADMAP.md).
