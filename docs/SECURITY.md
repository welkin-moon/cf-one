# Security policy and boundaries

## Secrets and Cloudflare control

Never commit `.dev.vars`, generated Wrangler configuration, API tokens, passwords, or invite codes. Production secrets are uploaded with Wrangler and are not ordinary plaintext environment variables.

`SESSION_SECRET` signs sessions and encrypts login verifiers. Keep it stable and back it up securely; rotating it invalidates sessions and makes existing verifier boxes unreadable. Account recovery and controlled key rotation remain roadmap work.

The automated deploy accepts Bearer API Tokens only. It does not accept Cloudflare Global API Keys or account passwords. Use separate tokens for provisioning and the runtime admin console. `MANAGED_ZONES` is an application-level backstop in addition to token scoping.

DNS mutations require an admin session, same-origin request, CSRF token, zone verification, exact confirmation value, and audit record.

## Accounts

- First registration requires both an allowlisted email (when configured) and `INVITE_CODE`.
- Later login uses a one-time KV challenge; challenges expire after five minutes and are deleted on use.
- PBKDF2 runs in the browser to stay inside the Workers Free 10 ms CPU limit. The password itself is never sent to the Worker.
- The stored verifier is encrypted with AES-GCM under a key derived from `SESSION_SECRET`; a D1-only leak does not expose a directly reusable verifier.
- Cookies are HttpOnly, Secure, SameSite=Lax, host-only, and short-lived relative to permanent credentials.
- Unsafe authenticated requests require a session CSRF value and matching `Origin`.
- Device information is a coarse HMAC of a few request headers. It is not cross-site tracking and never authenticates a user.

Passkeys and recovery codes remain the preferred long-term replacement for passwords.

## Mirror module

The mirror is intentionally not an arbitrary URL fetcher:

- aliases and origins are configured server-side;
- every request requires an admin session;
- origins must be credential-free HTTPS URLs;
- local, loopback, private IPv4, private/link-local IPv6, and cf-one's own domains are blocked;
- redirect rewriting stays inside the configured origin;
- hop-by-hop, client IP, and Cloudflare trace headers are removed;
- the cf-one session cookie and all unrelated browser cookies are removed;
- when enabled, upstream cookies are renamed per alias and restricted to `/mirror/<alias>/`;
- `Authorization` is stripped unless that target explicitly opts in;
- every mirrored document is forced into a CSP sandbox without `allow-same-origin`, so upstream scripts cannot read cf-one sessions or admin API responses;
- responses are private/no-store.

HTML attribute rewriting covers common links, forms, scripts, images, and frames. It cannot make every third-party application transparent: JavaScript-generated URLs, WebSockets, integrity hashes, service workers, origin-bound authentication, and applications that require normal same-origin storage may still fail. Do not add `allow-same-origin` to the mirror sandbox or weaken the module into an open proxy to fix such a target.

The application-wide same-origin guard also rejects unsafe requests emitted with the sandbox's opaque `Origin: null`. GET navigation, redirects, and isolated cookies work; state-changing forms and AJAX are intentionally not transparent in v0.1. A future fully interactive mode should use a dedicated, per-target hostname and a separate short-lived mirror session—not relax this boundary on the main application origin.

Only proxy services you own or have permission to proxy. Do not use it to evade access controls, geographic restrictions, paywalls, or network policy.

## Email and content

Inbound raw mail is capped by the handler and stored in a private R2 binding. Downloads use `message/rfc822`, an attachment disposition, no-store caching, and recipient/admin authorization.

Free-tier outbound mail is restricted in both Wrangler and application code to verified `EMAIL_DESTINATIONS`. Arbitrary sending, bulk mail, and marketing campaigns are out of scope.

## iOS distribution

The application catalog supports normal PWA installation and can link to a package produced by Apple's official Web Distribution process. iOS web distribution requires an eligible developer, App Store Connect registration, notarization, a registered domain, supported regions, and supported OS versions.

Certificate abuse, configuration-profile tricks, leaked enterprise signing, exploit chains, and App Store bypasses are explicitly out of scope.

## Before broad public use

Add passkeys, recovery flows, content reporting/moderation, media malware scanning, encrypted export/backup, session revocation, key rotation, automated security tests, dependency alerts, and quota alerts. The current target is a small invited friend group, not an anonymous public network.
