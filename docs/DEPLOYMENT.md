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

For the in-app admin console, create a second token and later store it on the Worker as the `CF_API_TOKEN` secret. Scope it only to the operations you want the console to expose. DNS read/edit for the two zones is sufficient for DNS management; account-level D1/KV/R2 read permissions are needed only for the resource inventory panel.

## 2. Connect the Git repository

In Cloudflare Workers & Pages:

1. Create a Worker by importing this GitHub repository.
2. Select `main` as the production branch.
3. Keep the repository root as the root directory.
4. Use `pnpm cf:deploy` as the deploy command.
5. Add the build credentials below under **Settings → Build → Build Variables and Secrets**.

Cloudflare Workers Builds runs the deploy command on each production commit. The script lists existing resources by name before creating anything, so repeat builds do not create duplicate D1, KV, or R2 resources.

## 3. Build credentials

| Name | Secret | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | no | Target account ID. |
| `CLOUDFLARE_API_TOKEN` | yes | Scoped provisioning/deployment token. |

These credentials provision resources and publish code only. They are never copied into the Worker runtime.

Optional build configuration:

| Name | Default | Meaning |
| --- | --- | --- |
| `CF_ONE_WORKER_NAME` | `cf-one-apex` | Worker service name. |
| `CF_ONE_D1_NAME` | `cf-one` | D1 database name. |
| `CF_ONE_KV_NAME` | `cf-one-cache` | KV namespace title. |
| `CF_ONE_R2_NAME` | `cf-one-media` | R2 bucket name; omitted if R2 is unavailable on the account. |
| `CF_ONE_DOMAINS` | `lunarlab.uk,20100823.xyz` | Custom Domains attached to this Worker. |
| `CF_ONE_ENABLE_EMAIL_SEND` | `0` | Set to `1` only after Email Service is configured. |
| `CF_ONE_EMAIL_DESTINATIONS` | empty | Comma-separated verified Cloudflare destinations. Required when free-tier sending is enabled. |

## 4. Worker runtime variables and secrets

After the first successful deployment, open **Workers & Pages → cf-one-apex → Settings → Variables and Secrets**. Configure these on the Worker itself, not as build variables. Future deployments use `keep_vars` and deliberately leave them unchanged.

Required secrets:

| Name | Purpose |
| --- | --- |
| `SESSION_SECRET` | Stable random value of at least 32 characters. It signs sessions and is the migration fallback for encrypted data. Do not rotate casually. |
| `CREDENTIAL_SECRET` | A different stable random value of at least 32 characters for credential and external-storage encryption. Existing boxes migrate on use. |
| `INVITE_CODE` | Allows first-time member registration. Rotate or remove it after the intended members have joined. |
| `OWNER_PASSWORD` | Password for the fixed owner login name `admin`. |

Optional secret:

| Name | Purpose |
| --- | --- |
| `CF_API_TOKEN` | Narrow runtime token for owner-only DNS/resource and mirror-domain operations. Keep it separate from the build token. |

Runtime variables:

| Name | Default | Meaning |
| --- | --- | --- |
| `APP_NAME` | `Lunar Lab` | Main profile name. |
| `CF_ACCOUNT_ID` | unset | Required only by runtime Cloudflare administration and mirror-domain provisioning. |
| `MANAGED_ZONES` | empty | Comma-separated zone backstop for runtime administration. |
| `DEVICE_BINDING` | `soft` | `soft` reports changed devices; `strict` requires a new login. |
| `MAIL_RECIPIENTS` | empty | Optional inbound-address allowlist. |
| `EMAIL_DESTINATIONS` | empty | Must match verified destinations when the Email binding is enabled. |
| `SITE_CONFIG` | `{}` | JSON per-host UI and feature overrides. |

Generate secrets locally, for example with `openssl rand -base64 48`. Never paste them into source files or commit them. Values marked as secrets above must use Cloudflare's **Secret** type, not plaintext text variables.

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

Open `/app/login` on `lunarlab.uk`. The fixed site-owner username is `admin`; it authenticates with `OWNER_PASSWORD`. For a member account, enter an email, a new password, and `INVITE_CODE`. The browser performs PBKDF2 locally and sends a one-time challenge proof; the raw member password never reaches the Worker. Later member logins need only email and password.

Any email address can register while the current invite code is known. After onboarding, rotate or remove `INVITE_CODE`; the owner can disable accounts or change member/admin roles from the application.
