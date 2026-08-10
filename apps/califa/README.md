# Califa Web Core

A role-configurable Cloudflare Worker foundation for the Califa social protocol.

The same codebase can currently run as one of three services:

- `user`: owns identity, encrypted content pointers, GitHub write control, scheduled archive jobs, and MCP/client APIs;
- `relay`: distributes object pointers and publishes tag, trusted-interaction, attestation, and value/content labels without caching post bodies or media;
- `circle`: maintains a strong-circle identity, submissions, admission/moderation events, and multi-operator checkpoints without owning source content.

## Run locally

```bash
pnpm --dir apps/califa dev
```

## Choose a role

Set `CALIFA_ROLE` to `user`, `relay`, or `circle` in `wrangler.jsonc` or the Cloudflare dashboard. Each deployment should also set:

```text
CALIFA_NETWORK
CALIFA_NODE_NAME
```

## Stable client compatibility surface

Clients should begin with:

```text
GET /.well-known/califa-node.json
GET /api/v1/compatibility
```

The manifest exposes the node role, capabilities, protocol version, encrypted content envelope, and signed event format. Future clients should feature-detect capabilities instead of assuming every deployment implements all roles.

## Architectural boundary

The relay is intentionally not a content CDN or content cache. Post bodies, comments, and media remain at user-controlled GitHub/Pages origins. Relay state should remain reconstructible from signed announcements and interaction edges.

## Next implementation slices

1. GitHub-backed setup wizard and credential provisioning.
2. Signed identity and delegated-device keys.
3. Encrypted object and media pack writer.
4. GitHub Discussions fast-write adapter plus scheduled journal compaction.
5. Relay batch announce ingestion and static tag/trust snapshots.
6. Circle manifest, submissions, moderation events, and quorum checkpoints.
