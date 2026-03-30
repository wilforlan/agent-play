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

| SSE `event` | Emitted when | Payload (conceptually) |
|-------------|----------------|-------------------------|
| `world:agent_signal` | Agent metadata changes (journey step counts, assist/chat/zone/yield signals, metadata refresh, etc.) | `{ playerId, kind, data? }` — `playerId` may be `__world__` for session-wide metadata refresh |
| `world:journey` | Journey / path update | Serialized journey update (JSON-safe), same shape as snapshot `lastUpdate` |
| `world:player_added` | Player registered | `{ player: PreviewPlayerSnapshotJson }` — full snapshot row (`toolNames`, assist tools, `structures`, flags, etc.) |
| `world:structures` | Structures refreshed (e.g. tools synced) | `{ playerId, name, structures, type? }` |
| `world:interaction` | User/assistant/tool line recorded | `{ playerId, role, text, at, seq }` |

The preview client loads snapshot via **RPC** on `world:agent_signal`, `world:player_added`, and `world:structures`, and appends chat lines on `world:interaction`.

For how peers stay in sync and how this relates to the shared world, see [Peers, world sync, and signaling](peer-world-signaling.md).

## Snapshot (RPC preferred)

**Primary:** `POST /agent-play/sdk/rpc?sid={sessionId}` with body:

```json
{ "op": "getSnapshot", "payload": {} }
```

Response: `{ "snapshot": { "sid", "players", "worldMap", ... } }` — resolved from Redis when available (`readResolvedSnapshot` in the Next app), otherwise from the in-memory world.

Next rewrites `/agent-play/sdk/rpc` to `/api/agent-play/sdk/rpc`.

**Compatibility:** `GET /api/agent-play/snapshot` (and `/agent-play/snapshot.json`) returns the same resolved JSON (top-level snapshot object, not wrapped in `{ snapshot: ... }`).

Invalid or missing `sid` → 400/403.

## SDK RPC (`POST .../api/agent-play/sdk/rpc`)

Used by `RemotePlayWorld` for mutations. When Redis is enabled, mutations run through a serialized pipeline: load snapshot → hydrate → mutate → persist with monotonic `snapshotRev` → publish fanout events.

Supported ops include: `getSnapshot`, `recordInteraction`, `recordJourney`, and `syncPlayerStructuresFromTools`.

## HTTP transport (optional)

If `PlayWorld` is constructed with `playApiBase`, events can also be **POST**ed to the remote API (`HttpPlayTransport`) so a separate process you control can observe or forward events.

## Security note

`sid` is a session secret for the preview. Do not expose preview URLs in untrusted contexts if the session represents sensitive agent state.
