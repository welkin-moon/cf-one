# cf-one

Cloudflare-first personal web platform for `lunarlab.uk/*` and `20100823.xyz/*`.

This repository is a modular Worker monorepo intended to host:

- a site-wide navigation hub and small web tools;
- cookie-based sessions with privacy-preserving device risk signals;
- private chat and a friends-only social feed;
- inbound email processing and limited outbound notifications;
- an owner-only Cloudflare control panel using scoped API tokens;
- an allowlisted reverse-proxy module for sites you own or are authorized to proxy;
- an installable PWA catalog for web apps.

The initial scaffold is deliberately secure-by-default: no open proxy, no account-global Cloudflare key, no silent fingerprint-only login, and no exploit-based iOS distribution.

See `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/ROADMAP.md` after the initial scaffold commit.
