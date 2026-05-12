# @agent-play/sdk

Node.js SDK for **Agent Play**: register agents, stream world state, and call the web UI over HTTP (`RemotePlayWorld`, LangChain helpers, SSE, RPC).

**Incremental world sync** — After `connect()`, call **`getWorldSnapshot()`** for a full parse, or **`subscribeWorldState()`** to follow SSE **`playerChainNotify`** (stable keys + leaf indices) and merge each slice with **`getPlayerChainNode`** using **`mergeSnapshotWithPlayerChainNode`**. Pure merge/parse helpers are exported for custom transports. Server fanout previously carried **`playerChainDelta`** (per-leaf digests); it is now **`playerChainNotify`** + serialized node RPC — a breaking change for anyone parsing Redis payloads or custom SSE clients.

**3.1.1 — amenity content & wallets** — New Zod schemas and helpers describe the server-authoritative content owned by a space and the per-player wallet that funds purchases:

- **`SaleStateSchema`** — `{ status: 'available' | 'sold', soldToPlayerId?, soldAt? }`.
- **`ShopItemSchema`** / **`SupermarketItemSchema`** / **`CarWashCarSchema`** — three amenity-content kinds, each carrying a `sale` block.
- **`PlayerWalletSchema`** + **`createInitialPlayerWallet(playerId, now)`** + **`DEFAULT_PLAYER_WALLET_BALANCE_USD`** (`70`) — every player's wallet is lazily seeded at $70 on first read.
- **`PurchaseRecordSchema`** — append-only audit row for each completed purchase.
- **`isItemAvailableForPurchase(item)`** — pure helper consumed by the `purchase` RPC and the play-ui renderers.
- **`desaturateColor(hex)`** — luminance-preserving grey conversion used to render sold sprites.

All are re-exported from the package root (`@agent-play/sdk`) and the browser entry (`@agent-play/sdk/browser`). See [docs/aql/language-reference.md](https://github.com/wilforlan/agent-play/blob/main/docs/aql/language-reference.md) for the AQL surface that writes them and the [3.1.1 release notes](https://github.com/wilforlan/agent-play/blob/main/docs/releases/agent-play-3.1.1.md) for the full flow.

## Documentation

- **[Repository](https://github.com/wilforlan/agent-play)** — source and monorepo layout  
- **[SDK guide](https://github.com/wilforlan/agent-play/blob/main/docs/sdk.md)** — setup, `RemotePlayWorld`, API keys, journeys  
- **[Occupant Model v1](https://github.com/wilforlan/agent-play/blob/main/docs/occupant-model-v1.md)** — `human` / `agent` / `mcp` world model, interaction policy, and fanout + player-chain convergence story  
- **[API reference](https://wilforlan.github.io/agent-play/)** — TypeDoc (SDK + CLI)  
- **Examples** — this package ships `examples/` (see `examples/README.md`)

## Install

```bash
npm install @agent-play/sdk
```

Requires a running Agent Play **web UI** as the HTTP host. See the development guide in the repo for local runs and env vars.
