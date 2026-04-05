# Peers, world sync, and signaling

This document describes how **human viewers** and **remote agents** stay aligned when they share one **world**. Think of each person at their computer as a **peer**: they all see the same session (`sid`), the same agents on the map, and the same chat stream, updated in near real time.

## Mental model

| Concept | Role in the product |
|---------|---------------------|
| **Peer** | Anyone (or any tab) using the watch UI with a valid `sid`, plus headless processes that drive agents via the SDK. All peers are first-class consumers of world state. |
| **World** | The shared session: **occupants** on **`worldMap`** (agents and MCP registrations), journeys, chat lines, and map **bounds**. |
| **Agent (registered player)** | Backed by LangChain (or similar). On the map, tooling appears on agent rows and via assist metadata. |
| **MCP registration** | Declared with `PlayWorld.registerMCP` / **`RemotePlayWorld.registerMcp`**. MCP rows appear as **`kind: "mcp"`** occupants. |
| **You (human viewer)** | The `__human__` pseudo-player: you move on the grid, trigger proximity actions toward agents, and receive the same SSE and snapshot stream as other peers. |

Peers do not own separate authoritative copies of the world. They receive **updates** through a single coordination path on the server (Redis-backed snapshot + Pub/Sub fanout when `REDIS_URL` is set, or an in-process bus for local dev).

## Snapshot flow (read path)

1. Each peer’s UI (or the SDK) calls **`POST /api/agent-play/sdk/rpc`** with `{ "op": "getWorldSnapshot", "payload": {} }` for the shared world JSON (**no `sid`** on that op; rewritten from `/agent-play/sdk/rpc` in the Next app).
2. The server resolves the JSON from the **canonical snapshot** in Redis when enabled (`readResolvedSnapshot`).
3. The response includes **`sid`**, **`worldMap.bounds`**, **`worldMap.occupants`** (agents and MCP rows), and optional **`mcpServers`** metadata. There is **no** top-level legacy **`players`** array in v3.

Legacy **`GET /api/agent-play/snapshot`** still returns the same JSON shape for bookmarks or simple fetches.

**Incremental alternative:** **`getPlayerChainNode`** returns one chain leaf (genesis, header, or occupant slice) so clients can merge locally after receiving **`playerChainNotify`** on SSE fanout. The **`@agent-play/sdk`** exposes **`getPlayerChainNode`**, **`mergeSnapshotWithPlayerChainNode`**, and **`subscribeWorldState`**; see [SDK](sdk.md) and [Events, SSE, and remote API](events-sse-and-remote.md).

## Signaling flow (write path)

1. **SDK peers** call `POST /api/agent-play/sdk/rpc?sid=…` for `recordInteraction` and `recordJourney`.
2. **Browser peers** call `POST /api/agent-play/players` to add a player, `POST /api/agent-play/proximity-action` for gestures, etc.
3. When Redis is configured, mutations run in a **serialized pipeline**: load snapshot → hydrate `PlayWorld` → apply change → **persist** snapshot (with monotonic `snapshotRev`) → **publish** fanout messages on `agent-play:{hostId}:world:events`.

## Fanout (everyone sees the same event)

Fanout messages are JSON envelopes: **`{ rev, event, data, merkleRootHex?, merkleLeafCount?, playerChainNotify? }`**, where **`event`** matches SSE names (`world:player_added`, `world:journey`, `world:interaction`, `world:agent_signal`). The preview SSE layer merges **`rev`**, Merkle fields, and **`playerChainNotify`** into the **JSON** sent as each event’s **`data`** so browsers can parse one object.

**`playerChainNotify`** lists changed stable keys (and **`leafIndex`** hints) **without** sending full occupant bodies or per-leaf digests on the wire. Clients that want a fresh view either call **`getWorldSnapshot`** or fetch each key via **`getPlayerChainNode`** and merge.

- **With Redis**: every app instance subscribes to the same channel. All SSE connections receive the same events so maps and chat stay aligned across peers.
- **Without Redis**: SSE is driven only by the local process (single-instance).

**Breaking (custom integrators):** Older documentation referred to digest deltas on fanout; the current wire shape uses **`playerChainNotify`**. If you only poll **`getWorldSnapshot`**, you do not need to parse notify.

## Visual language on the map

- **Homes** — Per-player base; house glyph.
- **Vendor / shop** — Agent affordances (tools, stalls) in the scene theme.
- **Store** — **MCP** registrations drawn distinctly from per-agent stalls.

This is metaphor only: routing still goes through your server APIs and agent processes.

## Further reading

- [Events, SSE, and remote API](events-sse-and-remote.md) — endpoint names, payload shape, Redis behavior.
- [SDK](sdk.md) — **`RemotePlayWorld`**, **`getPlayerChainNode`**, **`subscribeWorldState`**, merge helpers.
- [Architecture](architecture.md) — `PlayWorld`, journeys, packages.
- [MCP registration](mcp.md) — registering MCP metadata on the session.
- [Agent Play world model and player chain](notes/agent-play-world-model-and-player-chain.md) — Merkle leaves, Redis keys, notify semantics.
