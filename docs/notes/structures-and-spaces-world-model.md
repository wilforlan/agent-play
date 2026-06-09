# Structures and Spaces World Model

This note describes how outer-world **structure anchors** attach to authored **spaces**, how **ownership** and leases work, how metadata and amenities are represented, and how snapshots, the player chain, and the preview canvas stay aligned.

## Deprecated: tool-derived map layout

> **@deprecated (world map v3):** LangChain **tool names no longer create map structures**. Removed APIs: **`syncPlayerStructuresFromTools`**, SSE **`world:structures`**, tool-derived **`WorldStructure`** tiles. `langchainRegistration` still validates **`chat_tool`** and **`assist_*`** for watch UI only. Spatial inventory is **authored** as **spaces** with explicit **owners**. See [World map v3](../updates-world-map-v3.md).

## Naming

- **Journey step** `type: "structure"` (in `@types/world.ts`) refers to LLM tool-call steps on an agent path. That is unrelated to map occupant `kind: "structure"`.

## Snapshot shape

### Space catalog (`snapshot.spaces`)

Canonical metadata for each space, deduped by `id`. Defined as `SpaceCatalogEntryJson` in `packages/web-ui/src/server/agent-play/preview-serialize.ts`:

- `id`, `name`, `description`, `designKey`
- **`owner`**: `{ displayName, playerId?, nodeId? }` — **required for acquisition**; declares who holds the space
- `amenities`: ordered array of `supermarket` | `shop` | `car_wash` (see `space-amenity.ts`)
- Optional `activityObjectIds`, `amenityContent`, lease sidecar data

Normalized with `normalizePreviewSnapshot`: missing `spaces` is treated as `[]`.

### Structure occupant (`worldMap.occupants`)

Map anchors use occupant `kind: "structure"` (`PreviewWorldMapStructureOccupantJson`):

- `id`, `name`, `x`, `y`, `worldId`, `spaceIds`
- Denormalized for clients: `primaryAmenity`, `amenities` (derived from attached catalog rows for rendering)

> **@deprecated:** Caller-supplied **`x` / `y`** on `registerStructureNode` are ignored; anchors are auto-placed from the **worldLayout space zone** (see `resolveStructureAnchorsAtRuntime` in `grid-allocate.ts`).

## Ownership and acquisition

Spaces are **acquired** when an individual or node authors them with owner metadata:

| Path | How ownership is set |
|------|----------------------|
| **`registerSpaceNode`** | `owner.displayName` required; optional `playerId`, `nodeId` |
| **AQL `CREATE SPACE`** | `OWNER "Display Name"` (and optional structure name) after `CONNECT` |
| **`CREATE LEASE AMENITY`** | Tenancy on an amenity slot: tenant email/address, duration, optional `humanPlayerId` |

Structure sprites are **visual entry points** into owned catalog rows—they do not themselves confer ownership without a matching `snapshot.spaces` entry.

## Player chain leaves

In `packages/web-ui/src/server/agent-play/player-chain/index.ts`:

- Occupants use `stableOccupantSortKey`: includes `structure:{id}` for structure rows.
- After occupants, catalog rows are hashed as separate leaves: `space:{id}` (sorted by `id`), digest of canonical `stableStringify(spaceRow)`.

`readPlayerChainNode` resolves `space:{id}` keys to catalog rows (`kind: "space"` in the RPC response).

## PlayWorld APIs

`packages/web-ui/src/server/agent-play/play-world.ts`:

- `registerSpaceNode` / `registerStructureNode` persist via `runStoredWorldMutation` into `snapshot.spaces` and structure occupants.
- `listSpaceNodes` / `listStructureNodes` read from the snapshot (async).
- `enterStructureSpace` resolves the structure from snapshot occupants and emits `world:space_transition`.
- `createAmenityLease` / `cancelAmenityLease` manage amenity tenancy records.
- Player location remains tracked in-memory (`locationsByPlayerId`) for transitions.

Registration requires at least one amenity per space.

## Preview canvas (Pixi)

`packages/play-ui/src/main.ts` (mirrored under `packages/web-ui/src/canvas/vendor/`):

- `collectStructuresForRender` merges MCP tool stalls (`kind: "tool"`) with `kind: "structure"` occupants.
- `syncStructureNodes` draws amenity-specific vector art (`drawSupermarketStructure`, `drawShopStructure`, `drawCarWashStructure` in `structure-art.ts`).
- Primary facade uses `primaryAmenity` (default `shop`). Multiple amenities append a short parenthetical caption.

## SDK

`packages/sdk/src/public-types.ts` exposes `AgentPlayWorldMapStructureOccupant`, `AgentPlaySpaceCatalogEntry`, optional `AgentPlaySnapshot.spaces`, and player-chain node variants for `space:{id}`. Parsing lives in `parse-occupant-row.ts`, `remote-play-world.ts`, and `player-chain-merge.ts`.

## Follow-ups

- REST routes for authoring topology from external tools.
- `leaveSpace` and nested context stack if needed.
- Persist player location in snapshot or settings if reconnect must restore interior state.
