# SDK reference (`agent-play`)

Package root: [`play-sdk/`](../play-sdk/). Entry: [`src/index.ts`](../play-sdk/src/index.ts).

## `PlayWorld`

Defined in [`src/lib/play-world.ts`](../play-sdk/src/lib/play-world.ts).

| Method / property | Description |
|-------------------|-------------|
| `start()` | Creates session id, configures debug; must run before other operations. |
| `getSessionId()` | Current `sid`. |
| `isSessionSid(sid)` | Validates query `sid` for Express routes. |
| `getPreviewUrl()` | URL with `sid` query; uses `previewBaseUrl`, `PLAY_PREVIEW_BASE_URL`, or default host. |
| `addPlayer(input)` | Registers a player; requires `langchainRegistration(agent)`-style `agent` payload with `toolNames`. Emits player-added. |
| `recordJourney(playerId, journey)` | Low-level: store journey and emit update (usually driven by `ingestInvokeResult`). |
| `ingestInvokeResult(playerId, invokeResult)` | Parses LangChain result messages → journey → `recordJourney`. |
| `syncPlayerStructuresFromTools(playerId, toolNames)` | Re-layouts structures when tools change; may emit `world:structures`. |
| `recordInteraction({ playerId, role, text })` | Appends to per-player log; emits `world:interaction`. |
| `getSnapshotJson()` | Full preview snapshot including `worldMap`. |
| `onWorldJourney(cb)` | Subscribe to in-process journey updates (Node). |

Constructor options: `PlayWorldOptions` — `previewBaseUrl`, `playApiBase` (HTTP transport), `debug`.

## LangChain platform

[`src/platforms/langchain.ts`](../play-sdk/src/platforms/langchain.ts)

| Export | Role |
|--------|------|
| `langchainRegistration(agent)` | Builds `{ type: "langchain", toolNames }` from the agent’s tools. |
| `attachLangChainInvoke(agent, world, playerId)` | Wraps `invoke` to record interactions and ingest results. |

Requires an object with `invoke` (and optional `tools` for registration).

## Transport

[`src/lib/play-transport.ts`](../play-sdk/src/lib/play-transport.ts)

- **In-memory bus**: `EventEmitter`-based; used inside `PlayWorld` for the same process.
- **HTTP**: `HttpPlayTransport` POSTs events to a remote `playApiBase` when configured (multi-process or bridge setups).

Event name constants exported for both:

- `WORLD_JOURNEY_EVENT` (`world:journey`)
- `PLAYER_ADDED_EVENT` (`world:player_added`)
- `WORLD_STRUCTURES_EVENT` (`world:structures`)
- `WORLD_INTERACTION_EVENT` (`world:interaction`)

## Serialization

[`src/lib/preview-serialize.ts`](../play-sdk/src/lib/preview-serialize.ts)

- `serializeJourney`, `serializeWorldJourneyUpdate` — JSON-safe shapes for snapshot and SSE payloads.

## World map and bounds

- [`src/lib/world-map.ts`](../play-sdk/src/lib/world-map.ts) — `buildWorldMapFromPlayers` merges structures and computes axis-aligned bounds.
- [`src/lib/world-bounds.ts`](../play-sdk/src/lib/world-bounds.ts) — `clampWorldPosition` (shared concept with preview UI).

## Structure layout and journeys

- [`src/lib/structure-layout.ts`](../play-sdk/src/lib/structure-layout.ts) — Places tool “structures” in lanes; enriches journey steps with coordinates.
- [`src/lib/journey-from-messages.ts`](../play-sdk/src/lib/journey-from-messages.ts) — **LangChain-specific**: walks `AIMessage` / tool messages to build `Journey`.

## Express preview mount

[`src/preview/mount-express-preview.ts`](../play-sdk/src/preview/mount-express-preview.ts)

- `mountExpressPreview(app, world, { basePath?, assetsDir? })`
- Serves static files from `preview-ui/dist` by default (`defaultPreviewAssetsDir()`).
- Routes: `GET snapshot.json`, `GET events` (SSE), static assets under `basePath`.

## Debug

[`src/lib/agent-play-debug.ts`](../play-sdk/src/lib/agent-play-debug.ts)

- `AGENT_PLAY_DEBUG=1` or `PlayWorld({ debug: true })` for verbose logging.

## Type definitions

[`src/@types/world.ts`](../play-sdk/src/@types/world.ts) — `Journey`, `JourneyStep`, `WorldStructure`, `WorldJourneyUpdate`, etc.
