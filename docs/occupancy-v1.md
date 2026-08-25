# Occupancy Protocol v1 (Occupant Model v1)

Machine-readable host contract for **page-origin world clients** (for example `https://world2.v0peer.org` and future `worldN`). Occupancy is owned by Agent Play. Clients instance presentation from this API’s snapshot; GLB / png2glb packs are costumes, not occupancy.

**OpenAPI spec:** [occupancy-v1.openapi.yaml](occupancy-v1.openapi.yaml)

Legal entity: **Viroke Technologies Inc.**

## How to open the YAML

From a clone of this repository:

```bash
npx --yes @redocly/cli preview-docs docs/occupancy-v1.openapi.yaml
```

Or paste the YAML into [Swagger Editor](https://editor.swagger.io/) / [Swagger UI](https://swagger.io/tools/swagger-ui/). Redoc:

```bash
npx --yes @redocly/cli build-docs docs/occupancy-v1.openapi.yaml -o /tmp/occupancy-v1.html
```

The spec is OpenAPI 3.1. Paths under `servers` already include the `/api/agent-play` prefix except `POST /api/nodes/validate` (origin-root servers override).

## Canonical origins

| Origin | Role |
|--------|------|
| `https://agent-play.com` | Root occupancy / communication server. 2D game stays on `/`. |
| `https://agent-play.com/api/agent-play` | Canonical API base (no trailing slash). |
| `https://www.agent-play.com` | Same occupancy (alias). |
| `https://playworld.world` | Same occupancy (alias). |
| `https://world1.v0peer.org` | Same occupancy **while it exists**. Disposable alias; may be discontinued. Not canonical. |
| `https://world2.v0peer.org` and `worldN` | **Clients / cameras.** Never occupancy hosts. Never OpenAPI `servers`. Never `credentials.json` `serverUrl`. |

Next rewrites `/agent-play/*` to `/api/agent-play/*` (plus `/agent-play/nodes/validate` → `/api/nodes/validate`). Prefer `/api/agent-play` paths.

## Tags in the spec

| Tag | Meaning |
|-----|---------|
| `view-only` | No node credentials. Required for a world canvas: session, snapshot RPC, SSE, player-chain node. |
| `identity` | Node headers `x-node-id` + `x-node-passw` (hashed material, not the ten-word passphrase). |
| `later` | Existing host operations world clients may implement after view-only. Not World 2 Phase 1. |

## View-only load sequence

1. `GET /session` → `{ sid }` (`credentials: "omit"`). HUD shows a **prefix** only.
2. `POST /sdk/rpc` `{ "op": "getWorldSnapshot", "payload": {} }` → `{ snapshot }` (no `sid` query).
3. Parse `worldMap.bounds` and `worldMap.occupants`. Keep `worldLayout`, `parkingStreet`, `houseStreet` when present. Cars and houses are **not** occupants.
4. Optional compatibility: `GET /snapshot?sid=` returns the same snapshot **unwrapped**.
5. `GET /events?sid=` via `EventSource` (no `withCredentials`).
6. On `playerChainNotify.nodes`, fetch `getPlayerChainNode` in serialized order (cap 102 in play-ui). On parse failure or reconnect, refetch `getWorldSnapshot`.

There is **no** `moveHuman` RPC. Human locomotion is local and clamped to snapshot bounds.

## SSE (OpenAPI cannot fully express EventSource)

Documented on `GET /events` and in the YAML `info.description`. Named `event:` lines; JSON in `data:`; comment keepalive `: ping` every 30s.

Phase 1 names: `world:agent_signal`, `world:player_added`. Optional: `world:journey`. Later: `world:interaction`, `world:intercom`, `world:peer-call-state`, `world:peer-call-signal`, `world:space_transition`, `space:amenity_content_updated`. Not occupancy v1: `world:geography`.

Incremental envelope fields often merged into `data`: `rev`, `merkleRootHex`, `merkleLeafCount`, `playerChainNotify` (`updatedAt`, `nodes[]` with `stableKey`, `leafIndex`, optional `removed`).

## CORS (honest as of this spec)

Page origins call this API **cross-origin**. Do not send cookies. `sid` is JSON then `?sid=`.

Today the host already sends `Access-Control-Allow-Origin: *` (and `OPTIONS`) on **proximity-action**, geography, peer-call signal, player wallet REST, and world-layout bounds.

**session, sdk/rpc, events, and snapshot do not** send CORS today. A browser on `https://world2.v0peer.org` will fail those calls until `agent-play.com` adds `Access-Control-Allow-Origin` (allowlist World 2 or `*` for cookie-less view-only) and `OPTIONS` where POST preflights (`Content-Type: application/json`). SSE needs the header on the stream response. When `x-node-*` is used, allowlist the page origin and list those headers; do not combine `*` with credentialed cookies.

## Client notes (not this API)

- Mapping `(x, y) → Three.js (X, 0, Z)` is presentation.
- Members beat objects. Proximity radii: agents `0.72`, structures `2.4` (play-ui).
- Play Pad / A C P are client chrome.
- Arcade PU is `computeEventPuDelta` on the host. There is **no** featured-cabinet +10% PU.
- Tool names do not spawn buildings.
- `POST /api/agents` does **not** create identities (deprecated 410). Use CLI `create-agent-node` → `POST /api/nodes/agent-node`.
- This spec does not put a 3D canvas on `https://agent-play.com/`.

## Host routes that exist but are left out of this occupancy spec

These live under `packages/web-ui/src/app/api/` and are **not** the Occupant Model v1 canvas contract:

| Route | Why omitted |
|-------|-------------|
| `POST /api/agents` | Deprecated identity create (410). Do not implement. |
| `GET` / `DELETE /api/agents` | Node-scoped agent list/delete; not occupancy snapshot. |
| `POST /api/nodes/agent-node` | CLI identity create (`create-agent-node`). Not a world canvas call. |
| `POST /api/agent-play/players` and heartbeat/disconnect | Agent-host `addPlayer`; World 2 v1 is a human viewer. |
| `GET/POST /api/agent-play/players/:id/wallet` | REST duplicate of RPC `getPlayerWallet`; already CORS `*`. |
| `POST /api/agent-play/geography/*` | Geography mesh (later presence), not durable occupancy. CORS `*` already. |
| `POST /api/agent-play/peer-call/signal` | WebRTC signaling for peer voice; later. CORS `*` already. |
| `POST /api/agent-play/assist-tool` | Assist-tool execution, not snapshot. |
| `POST /api/agent-play/bootstrap` | Host bootstrap, not a world client. |
| `GET /api/agent-play/session/details`, `POST .../session/reset` | Preview/debug session admin. |
| `GET/POST /api/agent-play/world-layout/bounds` | Operator bounds; layout already arrives on the snapshot. CORS `*` already. |
| `POST /api/agent-play/mcp/register` | Deprecated MCP registration. |
| `POST /api/agent-play/organizations` | Org admin, not occupancy. |
| AQL `/api/aql` and playground | Stays on the host UI. |

Rewrites such as `/agent-play/snapshot.json` are aliases of documented `/snapshot`, not extra occupancy APIs.

## Related

- [Occupant Model v1](occupant-model-v1.md)
- [Events, SSE, and remote API](events-sse-and-remote.md)
- [Play UI](play-ui.md)
- [Architecture](architecture.md)
- World 2 protocol (client): `../world2/docs/world-protocol.md` when that repo sits beside this one
