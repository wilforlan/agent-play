# @agent-play/sdk

Node.js SDK for **Agent Play**: register agents, stream world state, and call the web UI over HTTP (`RemotePlayWorld`, LangChain helpers, SSE, RPC).

**Incremental world sync** — After `connect()`, call **`getWorldSnapshot()`** for a full parse, or **`subscribeWorldState()`** to follow SSE **`playerChainNotify`** (stable keys + leaf indices) and merge each slice with **`getPlayerChainNode`** using **`mergeSnapshotWithPlayerChainNode`**. Pure merge/parse helpers are exported for custom transports. Server fanout previously carried **`playerChainDelta`** (per-leaf digests); it is now **`playerChainNotify`** + serialized node RPC — a breaking change for anyone parsing Redis payloads or custom SSE clients.

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
