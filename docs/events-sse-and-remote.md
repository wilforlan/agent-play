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
| `world:agent_signal` | Agent metadata changes (journey step counts, assist/chat/zone/yield signals, etc.) | `{ playerId, kind, data? }` — not used for agent locomotion |
| `world:journey` | Reserved / legacy path for journey payloads | May be unused if the server emits only `world:agent_signal` for journey-related updates |
| `world:player_added` | Player registered | `{ playerId, name, structures, ... }` |
| `world:structures` | Structures refreshed (e.g. tools synced) | Player id + structure list |
| `world:interaction` | User/assistant/tool line recorded | `{ playerId, role, text, at, seq }` |

The preview client in [`main.ts`](../packages/play-ui/src/main.ts) reloads the snapshot on `world:agent_signal`, `world:player_added`, and `world:structures`, and appends chat lines on `world:interaction`. It does **not** animate registered agents along journey paths for movement; agents are **stationary** in the world model.

## Snapshot

`GET {basePath}/snapshot.json?sid={sessionId}`

Returns JSON from `PlayWorld.getSnapshotJson()`:

- `sid`
- `players[]` — `playerId`, `name`, `structures`, optional `lastUpdate`, `recentInteractions`, `stationary`, assist/chat aggregates, etc.
- `worldMap` — `bounds`, merged `structures` for rendering the grid
- optional `mcpServers[]` — registrations from `PlayWorld.registerMCP`

Invalid or missing `sid` → 400/403 from the mount helper.

## HTTP transport (optional)

If `PlayWorld` is constructed with `playApiBase`, events are also **POST**ed to the remote API (`HttpPlayTransport`) so a separate process can fan out SSE or persist events. This is optional for single-process Express + in-memory bus setups.

## Security note

`sid` is a session secret for the preview: the mount validates `world.isSessionSid(sid)` before streaming or returning JSON. Do not expose preview URLs in untrusted contexts if the session represents sensitive agent state.
