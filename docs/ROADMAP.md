# Roadmap

## v0.1 — usable foundation

- [x] one Worker with separate host profiles and feature gates;
- [x] idempotent D1/KV/R2 provisioning and generated deployment config;
- [x] browser-stretched credentials, one-time login proofs, signed sessions, CSRF, and device signals;
- [x] friends, feed, likes, private posts, rooms, room membership, and messages;
- [x] responsive front ends for every implemented module;
- [x] inbound email archive and verified-destination send mode;
- [x] scoped Cloudflare resource/DNS console with write confirmations and audit events;
- [x] owner-only mirror with cookie isolation and common HTML/redirect rewriting;
- [x] PWA shell and standards-compliant iOS distribution explanation;
- [x] explicit free-tier budget.

## v0.2 — hardening and product depth

- [ ] WebAuthn/passkeys, recovery codes, session list, and remote revocation;
- [ ] safe `SESSION_SECRET` key rotation and administrator-led account recovery;
- [ ] pagination/cursors, editing/deletion, replies, mentions, profile pages, and moderation;
- [ ] R2 media upload with per-user quotas, image validation, and attachment scanning;
- [ ] mail parsing, search, threads, forwarding, and reply UX;
- [ ] exported backups, restore drills, and account/data deletion;
- [ ] quota dashboard and alerts before free limits are exhausted;
- [ ] automated unit, integration, and browser tests in CI.

## v0.3 — realtime and interoperability

- [ ] SQLite-backed Durable Object room actors;
- [ ] hibernating WebSockets, delivery acknowledgements, typing, and presence;
- [ ] web push notifications;
- [ ] optional ActivityPub-compatible read-only export;
- [ ] end-to-end encrypted room experiment with explicit key backup UX.

## Inputs still needed from the owner

- exact feature split and visual copy for each domain;
- administrator and member email allowlists;
- desired inbound addresses and verified outbound destinations;
- authorized mirror origins and whether each needs cookies, authorization, or custom rewriting;
- whether chat should prioritize Telegram-like rooms, Matrix-like spaces, or direct messages first;
- any actual iOS app packages and Apple distribution eligibility. PWA catalog entries can be added without native packages.

## Explicit non-goals

- open or anonymous proxying;
- hidden fingerprint-only accounts;
- Cloudflare Global API Keys in the application;
- unrestricted outbound mail on a free plan;
- exploit-based iOS distribution;
- claiming free quotas are unlimited.
