# Events, SSE, and remote API

## SSE endpoint

When using `mountExpressPreview`, the browser opens:

`GET {basePath}/events?sid={sessionId}`

- Content-Type: `text/event-stream`
- Periodic comment pings (`: ping`) every 30s to keep connections alive
- Events use named SSE `event:` lines matching the transport constants

## Event names and payloads (preview)

| SSE `event` | Emitted when | Payload (conceptually) |
|-------------|----------------|-------------------------|
| `world:journey` | New journey recorded for a player | Serialized world journey update (path with x/y, structures) |
| `world:player_added` | Player registered | `{ playerId, name, structures, ... }` |
| `world:structures` | Structures refreshed (e.g. tools synced) | Player id + structure list |
| `world:interaction` | User/assistant/tool line recorded | `{ playerId, role, text, at, seq }` |

The preview client in [`main.ts`](../play-sdk/preview-ui/src/main.ts) listens for these and updates local state (waypoints, chat log, structure reload on snapshot).

## Snapshot

`GET {basePath}/snapshot.json?sid={sessionId}`

Returns JSON from `PlayWorld.getSnapshotJson()`:

- `sid`
- `players[]` — `playerId`, `name`, `structures`, optional `lastUpdate`, `recentInteractions`
- `worldMap` — `bounds`, merged `structures` for rendering the grid

Invalid or missing `sid` → 400/403 from the mount helper.

## HTTP transport (optional)

If `PlayWorld` is constructed with `playApiBase`, events are also **POST**ed to the remote API (`HttpPlayTransport`) so a separate process can fan out SSE or persist events. This is optional for single-process Express + in-memory bus setups.

## Security note

`sid` is a session secret for the preview: the mount validates `world.isSessionSid(sid)` before streaming or returning JSON. Do not expose preview URLs in untrusted contexts if the session represents sensitive agent state.
