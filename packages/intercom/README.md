# @agent-play/intercom

Shared **wire contracts** for Agent Play intercom: Zod parsers, channel key helpers, event names, and payload types used by `@agent-play/sdk`, the web UI, and `@agent-play/play-ui`.

Publish order in this monorepo: **`@agent-play/node-tools`** → **`@agent-play/intercom`** → packages that depend on them (e.g. `@agent-play/sdk`).

See the [monorepo overview](../../docs/monorepo.md) and [release notes](../../docs/releases/agent-play-3.1.1.md).

## Fanout events (3.1.1)

3.1.1 added two server-emitted fanout events that ride the existing SSE stream:

- **`space:amenity_content_updated`** — payload `{ spaceId, kind: 'shop' | 'supermarket' | 'carwash', revision }`. Emitted after any `addShopItem` / `addSupermarketItem` / `addCarWashCar` / `purchase` RPC so clients re-fetch the snapshot.
- **`player:wallet_seeded`** — payload `{ playerId, balanceUsd: 70 }`. Emitted exactly once per player, when the lazy wallet-seed path runs.
