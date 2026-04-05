# Architecture

## Purpose

**agent-play** connects a **running agent** (typically LangChain) to:

1. A **server-side model** of players, tool-derived **structures**, and **journeys** (ordered steps: origin, tool calls, destination).
2. A **preview UI** that renders a 2D scene and animates the agent along a path, with optional chat-style callouts.


## Core types

- **Session**: `PlayWorld.start()` creates a session id (`sid`) used in preview URLs and API validation.
- **Player**: One registered agent instance with a stable `playerId`, display name, and LangChain registration (tool names for structure layout).
- **Journey**: A structured value (`origin` → `structure` steps → `destination`) that your integration builds and passes to **`recordJourney`**.
- **World journey update**: Journey plus a **positioned path** (`path`) and **structures** for the preview; emitted as `world:journey`.
- **World map**: Aggregated bounds and structures for all players, included in snapshot JSON for the canvas grid.

## Data flow (LangChain path)

1. `PlayWorld.start()` → session id.
2. `addPlayer` → structures laid out from tool names, `world:player_added` (and optional HTTP forward).
3. Your integration calls **`recordJourney`** with the assembled journey (and **`recordInteraction`** for transcript lines when you want them in the UI).
4. `recordJourney` enriches path coordinates, clamps to bounds, stores last update, emits `world:journey`.
5. Preview loads snapshot via **`getWorldSnapshot` RPC** then subscribes to **`/api/agent-play/events?sid=`** (SSE) for live events. Cross-instance behavior uses Redis; see [Peers, world sync, and signaling](peer-world-signaling.md).

## Package boundaries

- **`agent-play` (library)**: No UI; Node-oriented. Depends on `@langchain/core` for message typing in journey extraction and LangChain adapter.
- **`@agent-play/play-ui`**: Browser-only; Pixi.js, DOM, markdown rendering. Consumes snapshot + SSE; shares [`world-bounds.ts`](../packages/sdk/src/lib/world-bounds.ts) with the server model for consistent clamping.

See [sdk.md](sdk.md), [preview-ui.md](preview-ui.md), and [peer-world-signaling.md](peer-world-signaling.md) for file-level detail.
