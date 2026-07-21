# Deployment

## 1. Create a scoped provisioning token

Create a Cloudflare API Token restricted to your account and the `lunarlab.uk` and `20100823.xyz` zones. The automated first deployment needs edit access for:

- Workers Scripts;
- D1;
- Workers KV Storage;
- Workers R2 Storage;
- Workers Routes / Custom Domains for the two zones;
- DNS for the two zones, because Custom Domains create their DNS records.

Do not use a Global API Key. The provisioning token exists only in the encrypted build environment and is not copied into the Worker runtime.

For the in-app admin console, create a second token in `CF_RUNTIME_API_TOKEN`. Scope it only to the operations you want the console to expose. DNS read/edit for the two zones is sufficient for DNS management; account-level D1/KV/R2 read permissions are needed only for the resource inventory panel.

## 2. Connect the Git repository

In Cloudflare Workers & Pages:

1. Create a Worker by importing this GitHub repository.
2. Select `main` as the production branch.
3. Keep the repository root as the root directory.
4. Use `pnpm cf:deploy` as the deploy command.
5. Add the variables below under **Settings → Build → Build Variables and Secrets**.

Cloudflare Workers Builds runs the deploy command on each production commit. The script lists existing resources by name before creating anything, so repeat builds do not create duplicate D1, KV, or R2 resources.

## 3. Required build secrets and variables

| Name | Secret | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | no | Target account ID. |
| `CLOUDFLARE_API_TOKEN` | yes | Scoped provisioning/deployment token. |
| `SESSION_SECRET` | yes | Stable random value, at least 32 characters. It signs sessions and encrypts stored login verifiers. Never rotate it casually. |
| `INVITE_CODE` | yes | Required only when creating or upgrading an account. Use a long random value. |
| `CF_ONE_ADMIN_EMAILS` | no | Comma-separated administrator accounts. |
| `CF_ONE_USER_ALLOWLIST` | no | Comma-separated accounts allowed to register. Leaving it empty allows anyone who knows the invite code. |

Generate secrets locally, for example with `openssl rand -base64 48`. Never paste them into source files or commit them.

## 4. Optional configuration

| Name | Default | Meaning |
| --- | --- | --- |
| `CF_RUNTIME_API_TOKEN` | unset | Scoped token uploaded as the Worker's `CF_API_TOKEN` secret. |
| `CF_ONE_DOMAINS` | `lunarlab.uk,20100823.xyz` | Custom Domains attached to this Worker. |
| `CF_ONE_MANAGED_ZONES` | same as domains | Only these zones may be touched by the admin API. |
| `CF_ONE_APP_NAME` | `Lunar Lab` | Main profile name. |
| `CF_ONE_DEVICE_BINDING` | `soft` | `soft` reports changed devices; `strict` requires a new login. |
| `CF_ONE_MIRROR_TARGETS` | `{}` | JSON map of server-approved mirror origins. |
| `CF_ONE_SITE_CONFIG` | `{}` | JSON per-host UI and feature overrides. |
| `CF_ONE_MAIL_RECIPIENTS` | empty | Optional inbound-address allowlist. |
| `CF_ONE_ENABLE_EMAIL_SEND` | `0` | Set to `1` only after Email Service is configured. |
| `CF_ONE_EMAIL_DESTINATIONS` | empty | Comma-separated verified Cloudflare destinations. Required when free-tier sending is enabled. |

Mirror example:

```json
{
  "docs": {
    "label": "My documentation",
    "origin": "https://docs.example.com",
    "allowCookies": true,
    "rewriteHtml": true
  }
}
```

Only configure origins you own or are authorized to proxy.

Site profile example:

```json
{
  "20100823.xyz": {
    "name": "Personal Index",
    "tagline": "A small personal edge workspace.",
    "accent": "#67e8f9",
    "features": ["tools", "store", "admin"]
  }
}
```

## 5. Email

Inbound mail uses Email Routing. After the Worker is deployed, configure Email Routing rules for each desired address and select this Worker as the action. Raw RFC822 messages go to R2; searchable metadata goes to D1.

On Workers Free, outbound sending to arbitrary recipients is unavailable. Sending to destination addresses already verified in your Cloudflare account is free. To enable that restricted mode:

1. add and verify the destination addresses in Cloudflare Email Routing;
2. set `CF_ONE_ENABLE_EMAIL_SEND=1`;
3. set the same addresses in `CF_ONE_EMAIL_DESTINATIONS`;
4. redeploy.

The generated `send_email` binding and the API both enforce this allowlist.

## 6. First login

Open `/app/login` on `lunarlab.uk`. Enter an email listed in `CF_ONE_USER_ALLOWLIST`, a new password, and `INVITE_CODE`. The browser performs PBKDF2 locally and sends a one-time challenge proof; the raw password never reaches the Worker. Later logins need only email and password.

The account is an administrator if its normalized email appears in `CF_ONE_ADMIN_EMAILS`.
