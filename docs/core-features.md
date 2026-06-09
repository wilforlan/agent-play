# Core features

This document lists **product-level capabilities** of agent-play as implemented in this repository. For API detail see [SDK reference](sdk.md); for the browser app see [Preview UI](preview-ui.md).

## Session and multi-agent

- **Play session** — `PlayWorld.start()` issues a session id (`sid`) tying together snapshot, SSE, and preview links.
- **Multiple players** — Each registered agent gets a `playerId`, journey history, and interaction log; appears as an **agent occupant** on the shared world map.
- **Preview URL** — `getPreviewUrl()` builds a URL with `?sid=` for opening the watch UI.

## LangChain integration

- **Registration** — `langchainRegistration(agent)` validates tool names (requires **`chat_tool`**) and indexes **`assist_*`** tools for assist/proximity UI on the watch canvas.
- **Journey updates** — Call **`recordJourney`** with a **`Journey`** value your pipeline constructs (steps may reference tool/structure semantics in the path narrative). Use **`recordInteraction`** for optional chat/tool log lines. Map post-run **messages** into those steps in your integration; the host stores and renders what you send.

> **@deprecated** Docs that said the world renders **structure nodes from tool names** or **`syncPlayerStructuresFromTools`** describe the pre–world-map-v3 model. See [World map v3](updates-world-map-v3.md).

## World model

- **Spaces** — Authored catalog entities with **owner**, amenities, inventory, and optional **leases**. Created via AQL, `registerSpaceNode`, or ops RPC—not derived from LangChain tools.
- **Structure anchors** — Canvas buildings (`kind: "structure"`) link overworld sprites to `spaceIds`; placement is computed from the world layout zone.
- **Positioned path** — Journey steps get **x/y** coordinates on a grid; paths are clamped to **world bounds** on the server when bounds are known.
- **World map snapshot** — Agents, MCP rows, and structure anchors share **`worldMap.occupants`** with axis-aligned **bounds** for the 2D preview grid.

## Real-time preview transport

- **In-memory events** — `PlayWorld` uses an event bus for same-process subscribers (journey, interaction, etc.).
- **Optional HTTP forwarding** — `playApiBase` can POST events to a remote service for multi-process setups.
- **Next.js host** — The web-ui app serves the watch UI, **`getWorldSnapshot` RPC**, **GET snapshot**, and **SSE** (`world:journey`, `world:player_added`, `world:interaction`, `world:agent_signal`), with Redis fanout when configured.

## Browser preview UI

- **2D canvas** — Pixi.js scene: theme, grid, structure anchors, space yards, amenities, avatars, optional crowd layer.
- **Movement animation** — Client interpolates along journey waypoints; debug joystick can drive the human viewer (when enabled).
- **Chat / callouts** — Markdown-capable panels above agents; visibility and layout settings.
- **Debug** — Coordinates and structure listing beside the canvas; optional localhost defaults for debug mode.

## Observability

- **Debug logging** — `AGENT_PLAY_DEBUG` or `PlayWorld({ debug: true })` for structured `console.debug` across key modules.

## Testing

- **Vitest** — Unit tests in `packages/sdk`, `packages/play-ui`, and `packages/web-ui` (versions may differ slightly per workspace).
