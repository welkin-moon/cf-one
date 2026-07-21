# Free-tier budget

Snapshot checked on 2026-07-21. Cloudflare can change quotas; verify the linked official pages before relying on them operationally.

| Product | Current free allowance relevant to cf-one | How cf-one stays inside it |
| --- | --- | --- |
| Workers | 100,000 requests/day and 10 ms CPU/invocation | Small dependency-free Worker, streaming mirror responses, no server-side password stretching. |
| D1 | 5 million rows read/day, 100,000 rows written/day, 5 GB total | Indexed room/feed queries, 100-row page limits, friend-scale usage. |
| KV | 100,000 reads/day, 1,000 writes/day, 1 GB | Used only for login challenges and login/IP throttling, not chat messages. |
| R2 Standard | 10 GB-month, 1 million Class A and 10 million Class B operations/month | Raw mail and later media; no public bucket. |
| Durable Objects | 100,000 requests/day with SQLite-backed objects available on Free | Not enabled in v0.1. HTTP polling avoids another required binding; a hibernating WebSocket room actor is a later option. |
| Email Routing | Unlimited inbound mail, billed only as normal Worker invocations | Raw mail streams directly into R2. |
| Email Sending | Arbitrary recipients unavailable on Workers Free; verified destination sends are free | Optional binding is off by default and requires an explicit verified-destination allowlist. |

Official references:

- [Workers limits and pricing](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [KV limits](https://developers.cloudflare.com/kv/platform/limits/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)

Chat polls only while a room page is visible, once every 12 seconds. A permanently open tab is about 7,200 Worker requests/day, so many always-open clients can still exhaust the account-wide 100,000 request allowance. Realtime Durable Objects with WebSocket hibernation should replace polling if usage grows.
