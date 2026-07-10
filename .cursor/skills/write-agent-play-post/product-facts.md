# Agent Play — product facts for posts

Use this file for accurate claims. When in doubt, understate and mark vision separately.

## One-line positioning

Agent Play is a **Spatial AI Playground** — walk a live multiverse where you and AI agents share one map. The product pairs a **developer SDK** with a **browser client** that visualize agent runs on a **2D world**: **owned spaces** with amenities, animated **journeys**, chat-style **callouts**, and **live updates** over HTTP/SSE (Redis fanout when configured).

## Core concepts

| Term | Meaning |
|------|---------|
| **Session** | `PlayWorld.start()` issues a `sid` tying snapshot, SSE, and preview URLs together |
| **Player / agent occupant** | One registered agent with `playerId`, journey history, interaction log; appears on the map as `kind: "agent"` |
| **Space** | Catalog entity (`snapshot.spaces`) with `owner`, amenities, content — **authored and acquired**, not inferred from tool names |
| **Structure occupant** | Canvas anchor (`kind: "structure"`) linking a building sprite to one or more `spaceIds`; auto-placed in the world layout zone |
| **Journey** | Origin → structure/tool steps → destination; rendered as a positioned path |
| **Amenity** | Interactive stage inside a space (shop, supermarket, car wash in 4.x) |
| **Purchase** | `purchase` RPC — debits player wallet and marks amenity items sold; indexed in Scanner |
| **AQL** | Agent Query Language — declarative authoring for spaces, ownership, amenities, inventory, wallets |
| **Snapshot** | Server-authoritative world state fanning out to all connected clients |
| **Watch UI** | Browser preview at `/agent-play/watch`; observe runs without steering production agents |

## Deprecated model (do not describe as current)

> **@deprecated narrative:** LangChain **tool names no longer spawn map structures**. Removed in world map v3: `syncPlayerStructuresFromTools`, SSE `world:structures`, tool-derived **`WorldStructure`** tiles. `langchainRegistration` still validates **`chat_tool`** and indexes **`assist_*`** tools for the watch UI only.

## Packages

- `@agent-play/sdk` — Node library, `RemotePlayWorld`, LangChain helpers
- `@agent-play/play-ui` — Pixi.js canvas, stages, amenities (browser)
- `@agent-play/web-ui` — Next.js host: snapshot RPC, SSE, playground
- `agent-play` CLI — bootstrap nodes, credentials, ops

## Shipped capabilities (honest snapshot)

- Multi-player sessions with separate journeys
- LangChain registration: **`chat_tool`** + **`assist_*`** for proximity/assist UI (not map layout)
- Authored **spaces** with **owner** metadata via `registerSpaceNode`, AQL `CREATE SPACE … OWNER …`, and amenity **leases**
- Real-time preview via snapshot + SSE (`world:journey`, interactions, player events)
- World-switch stage controller: overworld → space yard → amenity
- Amenities with server-authoritative wallets ($70 seed), atomic purchases, sold state
- AQL playground at `/playground` for authoring and ops scripts
- Kubernetes deployment docs; mobile-responsive watch UI
- Occupant model v1 for human/agent/mcp communication infrastructure

## Vision / direction (not all shipped)

- Agents as visible landmarks on the map (not only avatars)
- Public MCP as first-class amenities
- Richer multi-agent social UX between players
- Agent-side AQL authorship via programmatic API
- Card payments and wallet sign-in as structured amenities
- Developer dashboard beyond CLI
- Full playback/replay UX for journeys

## Integrations

- LangChain-oriented journey recording
- P2A (peer-to-agent) audio/realtime bridges documented under `docs/p2a/`
- `agent-service` repo: multi-agent runtime that can connect via `RemotePlayWorld`

## Tone anchors from existing copy

- "Most agent tooling is optimized for text… Agent Play asks: what if you could **see** your agents move through a space?"
- "Agents are no longer guests at a chat window. They live in *places*."
- Spaces are **acquired** — individuals and nodes declare **ownership** when authoring; amenity **leases** formalize tenancy.
- Honesty: early OSS, credible slice today, direction without fixed dates

## Doc links (repo)

- Overview: `docs/overview.md`
- Architecture: `docs/architecture.md`
- Structures & spaces: `docs/notes/structures-and-spaces-world-model.md`
- World map v3 migration: `docs/updates-world-map-v3.md`
- Blog example: `docs/blog/agent-play-4.0-spaces-amenities-aql.md`
- AQL: `docs/aql/introduction.md`
- API docs: https://wilforlan.github.io/agent-play/
