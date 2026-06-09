# Architecture

## Purpose

**agent-play** connects a **running agent** (typically LangChain) to:

1. A **server-side model** of players, **authored spaces** (with ownership and amenities), **structure anchors** on the map, and **journeys** (ordered steps: origin, tool calls, destination).
2. A **preview UI** that renders a 2D scene and animates the agent along a path, with optional chat-style callouts.

For the current world-state contract and transport story across all clients, see **[Occupant Model v1](occupant-model-v1.md)**.

> **@deprecated** Earlier docs described **tool-derived structures** (`syncPlayerStructuresFromTools`, SSE `world:structures`). That layout model was removed in **[World map v3](updates-world-map-v3.md)**. Tool names from `langchainRegistration` now drive **assist/chat UI only**, not map tiles.


## Core types

- **Session**: `PlayWorld.start()` creates a session id (`sid`) used in preview URLs and API validation.
- **Player / agent occupant**: One registered agent instance with a stable `playerId`, display name, and LangChain registration (`chat_tool`, `assist_*` tools). Appears on the map as `worldMap.occupants` with `kind: "agent"`.
- **Space**: Catalog row in `snapshot.spaces` — amenities, content, **owner** (`displayName`, optional `playerId` / `nodeId`), optional leases. Created via `registerSpaceNode`, AQL `CREATE SPACE … OWNER …`, or RPC.
- **Structure occupant**: Map anchor (`kind: "structure"`) with `spaceIds`; canvas sprite auto-placed from the world layout zone (caller `x`/`y` on `registerStructureNode` are **deprecated** and ignored).
- **Journey**: A structured value (`origin` → `structure` steps → `destination`) that your integration builds and passes to **`recordJourney`**.
- **World journey update**: Journey plus a **positioned path** (`path`) for the preview; emitted as `world:journey`.
- **World map**: Aggregated bounds and occupants (agents, MCP, structures) in snapshot JSON for the canvas grid.

## Data flow (LangChain path)

1. `PlayWorld.start()` → session id.
2. **`addPlayer` / `addAgent`** → agent occupant on the grid, `world:player_added` (and optional HTTP forward). **Spaces are authored separately** (AQL, `registerSpaceNode`, ops scripts)—not inferred from tool names.
3. Your integration calls **`recordJourney`** with the assembled journey (and **`recordInteraction`** for transcript lines when you want them in the UI).
4. `recordJourney` enriches path coordinates, clamps to bounds, stores last update, emits `world:journey`.
5. Preview loads snapshot via **`getWorldSnapshot` RPC** then subscribes to **`/api/agent-play/events?sid=`** (SSE) for live events. Cross-instance behavior uses Redis; see [Peers, world sync, and signaling](peer-world-signaling.md).

## Space ownership and acquisition

Individuals and nodes **acquire** spaces by authoring them with an **owner**:

- **`registerSpaceNode`** requires `owner.displayName` (optional `playerId`, `nodeId`).
- **AQL** — `CREATE SPACE "Name" DESIGN "key" OWNER "Display Name" …` then `USE SPACE NODE` for amenities, content, and **`CREATE LEASE AMENITY`** for tenancy records.
- **Leases** — `createAmenityLease` ties an amenity slot on a space to tenant contact fields and optional `humanPlayerId`.

Structure sprites on the overworld **point at** owned catalog spaces; they do not replace the ownership record.

## Package boundaries

- **`agent-play` (library)**: No UI; Node-oriented. Depends on `@langchain/core` for message typing in journey extraction and LangChain adapter.
- **`@agent-play/play-ui`**: Browser-only; Pixi.js, DOM, markdown rendering. Consumes snapshot + SSE; shares [`world-bounds.ts`](../packages/sdk/src/lib/world-bounds.ts) with the server model for consistent clamping.

See [sdk.md](sdk.md), [preview-ui.md](preview-ui.md), [structures and spaces world model](notes/structures-and-spaces-world-model.md), and [peer-world-signaling.md](peer-world-signaling.md) for file-level detail.
