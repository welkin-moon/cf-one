# Roadmap

## Phase 1 — foundation

- [x] unified Worker router
- [x] D1 schema for users/chat/posts/mail/audit
- [x] signed cookie sessions
- [x] minimal chat and feed APIs
- [x] inbound email archive
- [x] scoped read-only Cloudflare API facade
- [x] allowlisted owner-only mirror
- [x] installable PWA shell

## Phase 2 — usable product

- [ ] WebAuthn and email magic-link login
- [ ] friend/invite model and room membership UI
- [ ] chat/social front ends
- [ ] R2 media upload with quotas
- [ ] rate limiting, CSRF protection, and abuse controls
- [ ] full-text search and export
- [ ] Cloudflare resource dashboard with explicit write confirmations

## Phase 3 — realtime and federation

- [ ] Durable Object room actors and WebSockets
- [ ] notifications and presence
- [ ] optional ActivityPub-compatible read-only export
- [ ] encrypted backups and disaster recovery drills

## Explicit non-goals

- open/anonymous proxying
- hidden fingerprint-only accounts
- storing Cloudflare Global API Keys
- exploit-based iOS app distribution
- pretending free-tier quotas are unlimited
