# Core features

This document lists **product-level capabilities** of agent-play as implemented in this repository. For API detail see [SDK reference](sdk.md); for the browser app see [Preview UI](preview-ui.md).

## Session and multi-agent

- **Play session** — `PlayWorld.start()` issues a session id (`sid`) tying together snapshot, SSE, and preview links.
- **Multiple players** — Each registered agent gets a `playerId`, own structures (tool layout), journey history, and interaction log.
- **Preview URL** — `getPreviewUrl()` builds a URL with `?sid=` for opening the watch UI.

## LangChain integration

- **Registration** — `langchainRegistration(agent)` exposes tool names (requires **`chat_tool`**) and indexes **`assist_*`** tools for assist UI; the world renders **structure nodes** from tool names.
- **Journey updates** — Call **`recordJourney`** with a **`Journey`** value your pipeline constructs (steps align to structures on the map). Use **`recordInteraction`** for optional chat/tool log lines. Map post-run **messages** into those steps in your integration; the host stores and renders what you send.

## World model

- **Structures** — Tools appear as placed **world objects** (home lane + tool pads) with kinds and labels derived from layout rules.
- **Positioned path** — Journey steps get **x/y** coordinates on a grid; paths are clamped to **world bounds** on the server when bounds are known.
- **World map snapshot** — Merged structures and axis-aligned **bounds** for the 2D preview grid.

## Real-time preview transport

- **In-memory events** — `PlayWorld` uses an event bus for same-process subscribers (journey, interaction, structures, etc.).
- **Optional HTTP forwarding** — `playApiBase` can POST events to a remote service for multi-process setups.
- **Next.js host** — The web-ui app serves the watch UI, **`getSnapshot` RPC**, **GET snapshot**, and **SSE** (`world:journey`, `world:player_added`, `world:structures`, `world:interaction`), with Redis fanout when configured.

## Browser preview UI

- **2D canvas** — Pixi.js scene: theme, grid, structures, avatars, optional crowd layer.
- **Movement animation** — Client interpolates along journey waypoints; debug joystick can drive the primary agent (when enabled).
- **Chat / callouts** — Markdown-capable panels above agents; visibility and layout settings.
- **Debug** — Coordinates and structure listing beside the canvas; optional localhost defaults for debug mode.

## Observability

- **Debug logging** — `AGENT_PLAY_DEBUG` or `PlayWorld({ debug: true })` for structured `console.debug` across key modules.

## Testing

- **Vitest** — Unit tests in `packages/sdk`, `packages/play-ui`, and `packages/web-ui` (versions may differ slightly per workspace).
