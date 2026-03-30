# Peers, world sync, and signaling

This document describes how **human viewers** and **remote agents** stay aligned when they share one **world**. Think of each person at their computer as a **peer**: they all see the same session (`sid`), the same agents on the map, and the same structures, updated in near real time.

## Mental model

| Concept | Role in the product |
|---------|---------------------|
| **Peer** | Anyone (or any tab) using the watch UI with a valid `sid`, plus the headless processes that drive agents via the SDK. All peers are first-class consumers of world state. |
| **World** | The shared session: players (`playerId`), tool-derived **structures** (homes, vendor stalls, service kiosks), optional **MCP store** facades, journeys, chat lines, and map bounds. |
| **Agent (registered player)** | Backed by LangChain (or similar). On the map, agent tooling is shown as **vendor / shop** stalls—small amenity glyphs representing callable tools. |
| **MCP registration** | Declared with `PlayWorld.registerMCP`. In the watch UI, each registration is drawn as a **store**—a larger facade suggesting an integration hub, distinct from per-agent stalls. |
| **You (human viewer)** | The `__human__` pseudo-player: you move on the grid, trigger proximity actions toward agents, and receive the same SSE and snapshot stream as other peers. |

Peers do not own separate copies of the world. They receive **updates** through a single coordination path on the server (Redis-backed snapshot + Pub/Sub fanout when `REDIS_URL` is set, or an in-process bus for local dev).

## Snapshot flow (read path)

1. Each peer’s UI calls **`POST /api/agent-play/sdk/rpc?sid=…`** with `{ "op": "getSnapshot", "payload": {} }` (rewritten from `/agent-play/sdk/rpc` in the Next app).
2. The server resolves the JSON from the **canonical snapshot** in Redis (when enabled) and merges with the in-memory `PlayWorld` when needed (`readResolvedSnapshot`).
3. The response includes `sid`, `players[]`, `worldMap`, and optional `mcpServers[]`. The canvas places **vendor** sprites on agent tool structures and **store** sprites from `mcpServers`.

Legacy **`GET /api/agent-play/snapshot`** still returns the same JSON shape for bookmarks or simple fetches.

## Signaling flow (write path)

1. **SDK peers** call `POST /api/agent-play/sdk/rpc` for `recordInteraction`, `recordJourney`, and `syncPlayerStructuresFromTools`.
2. **Browser peers** call `POST /api/agent-play/players` to add a player, `POST /api/agent-play/proximity-action` for gestures, etc.
3. When Redis is configured, mutations run in a **serialized pipeline**: load snapshot → **hydrate** `PlayWorld` → apply change → **persist** snapshot (with monotonic `snapshotRev`) → **publish** fanout messages on `agent-play:{hostId}:world:events`.

## Fanout (everyone sees the same event)

Fanout payloads are small JSON envelopes: `{ rev, event, data }`, where `event` matches SSE names (`world:player_added`, `world:journey`, `world:structures`, `world:interaction`, `world:agent_signal`).

- **With Redis**: every app instance subscribes to the same channel. All SSE connections, on every machine, receive the same events, so maps and chat stay aligned across peers.
- **Without Redis**: SSE is driven only by the local `PlayWorld` bus on that one Node process (fine for a single developer machine).

After an event, clients typically call **`getSnapshot` again** so the grid, stalls, and stores match the latest persisted state.

## Visual language on the map

- **Homes** — Per-player base; unchanged house glyph.
- **Vendor / shop** — Agent **tool** (and related non-home) structures: striped awning stall, representing “something this agent sells” (an invocable capability).
- **Store** — **MCP** registrations: larger storefront, visually distinct from stalls, representing shared integration endpoints rather than one agent’s tool row.

This is metaphor only: routing still goes through your server APIs and agent processes; the sprites help peers **recognize** agent affordances vs global MCP hooks.

## Further reading

- [Events, SSE, and remote API](events-sse-and-remote.md) — endpoint names and Redis behavior.
- [Architecture](architecture.md) — `PlayWorld`, journeys, packages.
- [MCP registration](mcp.md) — registering MCP metadata on the session.
