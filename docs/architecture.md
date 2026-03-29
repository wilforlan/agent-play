# Architecture

## Purpose

**agent-play** connects a **running agent** (typically LangChain) to:

1. A **server-side model** of players, tool-derived **structures**, and **journeys** (ordered steps: origin, tool calls, destination).
2. A **preview UI** that renders a 2D scene and animates the agent along a path, with optional chat-style callouts.


## Core types

- **Session**: `PlayWorld.start()` creates a session id (`sid`) used in preview URLs and API validation.
- **Player**: One registered agent instance with a stable `playerId`, display name, and LangChain registration (tool names for structure layout).
- **Journey**: Extracted from LangChain **messages** after an `invoke` completes (`journey-from-messages.ts`): origin (user), structure steps (tool calls), destination (assistant).
- **World journey update**: Journey plus a **positioned path** (`path`) and **structures** for the preview; emitted as `world:journey`.
- **World map**: Aggregated bounds and structures for all players, included in snapshot JSON for the canvas grid.

## Data flow (LangChain path)

1. `PlayWorld.start()` → session id.
2. `addPlayer` → structures laid out from tool names, `world:player_added` (and optional HTTP forward).
3. Your integration can call **`ingestInvokeResult`** after an `invoke` (or equivalent) so `recordJourney` runs from extracted messages.
4. `recordJourney` enriches path coordinates, clamps to bounds, stores last update, emits `world:journey`.
5. Preview loads `snapshot.json?sid=` then subscribes to `events?sid=` (SSE) for live events.

## Package boundaries

- **`agent-play` (library)**: No UI; Node-oriented. Depends on `@langchain/core` for message typing in journey extraction and LangChain adapter.
- **`agent-play-preview-ui`**: Browser-only; Pixi.js, DOM, markdown rendering. Consumes snapshot + SSE; does not import the core package directly (duplicated world-bounds helper is imported from `@play-sdk/lib` path alias where configured).

See [sdk.md](sdk.md) and [preview-ui.md](preview-ui.md) for file-level detail.
