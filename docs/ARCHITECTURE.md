# Architecture

## Request path

Both domains route to one Worker. The Worker dispatches by path:

- `/` and `/app/*`: navigation/PWA shell
- `/api/auth/*`: invite-code bootstrap and signed sessions
- `/api/chat/*`: private rooms and messages
- `/api/social/*`: friends-only feed
- `/api/tools/*`: small stateless tools
- `/api/admin/cf/*`: explicit, read-only Cloudflare API operations
- `/mirror/:alias/*`: owner-only, configured reverse proxy

## Storage

D1 stores relational data. R2 stores larger blobs and raw inbound messages. KV is reserved for rate limits, ephemeral challenges, and cache entries.

## Realtime plan

The first scaffold uses HTTP polling. A later version should place each chat room in a Durable Object and expose WebSockets. Durable Objects consume their own Workers quotas, so polling is the safer free-plan starting point.

## Authentication

Sessions are signed, HttpOnly, Secure, SameSite=Lax cookies. A coarse device hash can help detect changed clients, but it is deliberately not a password and not a stable cross-site fingerprint. Replace invite-code login with WebAuthn or email magic links before inviting many users.

## Email

Email Routing invokes the Worker's `email()` handler. The raw RFC822 stream goes to R2; searchable metadata goes to D1. On the Workers Free plan, arbitrary outbound sending is not assumed. Notification sends should initially target verified destination addresses only.
