# Events, SSE, and remote API

## SSE endpoint (Next.js web-ui)

The hosted app exposes preview streaming at:

`GET /api/agent-play/events?sid={sessionId}`

(rewritten from `/agent-play/events` when using the default base path.)

- Content-Type: `text/event-stream`
- Periodic comment pings (`: ping`) every 30s to keep connections alive
- Events use named SSE `event:` lines matching the transport constants

### Redis and multi-instance

When `REDIS_URL` is set, preview events are **published** to a Redis Pub/Sub channel (`agent-play:{hostId}:world:events`) after each snapshot revision. SSE handlers subscribe to that channel so **every** connected preview tab receives the same events even if HTTP requests hit different server instances. The canonical world snapshot is stored in Redis; mutating routes hydrate `PlayWorld` from Redis before applying changes, then persist and publish.

Without Redis, SSE falls back to the process-local `PlayWorld` event bus only (single-instance).

## Event names and payloads (preview)

| SSE `event` | Emitted when | Payload (JSON `data`) |
|-------------|----------------|------------------------|
| `world:agent_signal` | Agent metadata changes (journey step counts, assist/chat/zone/yield signals, metadata refresh, etc.) | Domain fields (`playerId`, `kind`, …) **plus** when the publish included chain metadata: **`rev`**, optional **`merkleRootHex`**, **`merkleLeafCount`**, optional **`playerChainNotify`** (`updatedAt`, **`nodes`** with `stableKey`, `leafIndex`, optional `removed`) |
| `world:journey` | Journey / path update | Serialized journey update; same optional chain fields as above when attached to fanout |
| `world:player_added` | Agent registered | `{ player: … }` plus the same optional **chain** fields when the persist carried them |
| `world:interaction` | User/assistant/tool line recorded | `{ playerId`, `role`, `text`, … } plus optional **chain** fields if the server attached them to that fanout message (often absent for interaction-only publishes) |

The **watch UI** (`play-ui` / canvas) prefers **incremental sync** when **`playerChainNotify.nodes`** is non-empty: it POSTs **`getPlayerChainNode`** for each node reference **in order** (serialized), merges into the local snapshot model, and only falls back to **`getWorldSnapshot`** when notify is missing or merge fails. For events without notify it may still refetch the full snapshot where the client always did (for example some **`world:agent_signal`** paths).

There is no **`world:structures`** event (see [World map v3](updates-world-map-v3.md)).

For how peers stay in sync and how this relates to the shared world, see [Peers, world sync, and signaling](peer-world-signaling.md).

## Snapshot and player-chain RPC (read path)

**Full world read:** `POST /agent-play/sdk/rpc` (no `sid` query) with body:

```json
{ "op": "getWorldSnapshot", "payload": {} }
```

Response: `{ "snapshot": { "sid", "worldMap": { "bounds", "occupants" }, "mcpServers?" } }` — resolved via `readResolvedSnapshot` when Redis is enabled.

**Incremental slice read (same session, no `sid` on this op):**

```json
{ "op": "getPlayerChainNode", "payload": { "stableKey": "agent:..." } }
```

Response: `{ "node": { ... } }` — genesis, header, occupant, or removed occupant. Stable keys match the server player chain (`__genesis__`, `__header__`, `agent:id`, `mcp:id`). See [Agent Play world model and player chain](notes/agent-play-world-model-and-player-chain.md).

**Mutations:** other RPC ops still require `?sid={sessionId}`.

Next rewrites `/agent-play/sdk/rpc` to `/api/agent-play/sdk/rpc`.

**Compatibility:** `GET /api/agent-play/snapshot` (and `/agent-play/snapshot.json`) returns the same resolved JSON (top-level snapshot object, not wrapped in `{ snapshot: ... }`).

Invalid or missing `sid` on **mutating** RPC → 400/403.

## SDK RPC (`POST .../api/agent-play/sdk/rpc`)

Used by `RemotePlayWorld` for reads and mutations. When Redis is enabled, mutations run through a serialized pipeline: load snapshot → hydrate → mutate → persist with monotonic `snapshotRev` → publish fanout events.

Supported ops include: **`getWorldSnapshot`** (no `sid`), **`getPlayerChainNode`** (no `sid`), **`recordInteraction`**, and **`recordJourney`** (with `sid`).

## HTTP transport (optional)

If `PlayWorld` is constructed with `playApiBase`, events can also be **POST**ed to the remote API (`HttpPlayTransport`) so a separate process you control can observe or forward events.

## Security note

`sid` is a session secret for the preview. Do not expose preview URLs in untrusted contexts if the session represents sensitive agent state.
