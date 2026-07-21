# Security policy and boundaries

## Secrets

Store secrets with `wrangler secret put`; never commit `.dev.vars`. Use scoped API tokens with only the zone/account permissions needed by the explicit admin endpoints. Global API Keys and account passwords are out of scope.

## Mirror module

The mirror is intentionally not an arbitrary URL fetcher. Targets are configured server-side in `MIRROR_TARGETS`, require an admin session, must use HTTPS, and common private-network destinations are blocked. Cookies and Authorization are stripped unless a target explicitly opts in.

Only proxy sites you own or have permission to proxy. Do not use this module to evade access controls, geographic restrictions, paywalls, or network policy. HTML/CSP rewriting is not included, so complex third-party apps may not function.

## Device signals

Browser/device characteristics are used only as a risk signal. They are HMAC-derived, never sufficient for authentication, and should not be retained longer than necessary.

## iOS/PWA

The repository supports normal standards-based PWA installation. It does not include certificate abuse, profile tricks, App Store bypasses, or vulnerability exploitation.

## Before production

Add CSRF tokens for state-changing browser forms, per-user and per-IP rate limiting, content moderation/reporting, attachment scanning, backup/export, WebAuthn, recovery codes, and automated dependency/security checks.
