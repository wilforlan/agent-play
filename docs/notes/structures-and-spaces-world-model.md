# Structures and Spaces World Model

This note describes how outer-world **structures** attach to authored **spaces**, how metadata and amenities are represented, and how snapshots, the player chain, and the preview canvas stay aligned.

## Naming

- **Journey step** `type: "structure"` (in `@types/world.ts`) refers to LLM tool-call steps on an agent path. That is unrelated to map occupant `kind: "structure"`.

## Snapshot shape

### Space catalog (`snapshot.spaces`)

Canonical metadata for each space, deduped by `id`. Defined as `SpaceCatalogEntryJson` in `packages/web-ui/src/server/agent-play/preview-serialize.ts`:

- `id`, `name`, `description`, `designKey`
- `owner`: `{ displayName, playerId?, nodeId? }`
- `amenities`: ordered array of `supermarket` | `shop` | `car_wash` (see `space-amenity.ts`)
- Optional `activityObjectIds`

Normalized with `normalizePreviewSnapshot`: missing `spaces` is treated as `[]`.

### Structure occupant (`worldMap.occupants`)

Map anchors use occupant `kind: "structure"` (`PreviewWorldMapStructureOccupantJson`):

- `id`, `name`, `x`, `y`, `worldId`, `spaceIds`
- Denormalized for clients: `primaryAmenity`, `amenities` (derived from attached catalog rows for rendering)

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
