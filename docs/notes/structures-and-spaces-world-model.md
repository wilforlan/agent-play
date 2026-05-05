# Structures and Spaces World Model

This note introduces a world organization layer where a structure node can route a player into one of multiple attached spaces.

## Goal

Support many unique world experiences without duplicating outer-world layout:

- `StructureNode` anchors a place in the world map (for example, a supermarket building).
- `SpaceNode` defines a distinct authored experience (for example, a grocery interior or pharmacy annex).
- Player transitions resolve from a structure entry into a selected attached space.

## Data Model

`packages/web-ui/src/server/agent-play/@types/world.ts`:

- `SpaceNode`
  - `id`, `name`, `designKey`, `activityObjectIds`
- `StructureNode`
  - `id`, `name`, `x`, `y`, `worldId`, `spaceIds`
- `WorldPlayerLocation`
  - `playerId`, `worldId`, optional `structureId` and `spaceId`
- `WorldSpaceTransition`
  - `playerId`, `from`, `to`, `at`

## Runtime APIs

`packages/web-ui/src/server/agent-play/play-world.ts` now includes:

- `registerSpaceNode(input)`
- `listSpaceNodes()`
- `registerStructureNode(input)`
- `listStructureNodes()`
- `getPlayerLocation(playerId)`
- `enterStructureSpace(input)`

Transition fanout event:

- `WORLD_SPACE_TRANSITION_EVENT` in `play-transport.ts`

Transition behavior:

1. Validate that player exists in the active world snapshot.
2. Resolve structure and target space id (`spaceId` override or structure default first space).
3. Validate that selected space is attached to the structure.
4. Update in-memory player location map.
5. Emit and publish `world:space_transition`.

## Current Scope

- Structure/space registry is in-memory within `PlayWorld`.
- Transition events are published to world fanout and HTTP transport.
- Player location context is independent from occupant coordinates.

## Next Steps

- Persist structures, spaces, and player location context in session snapshot or session settings.
- Add optional return transitions (`leaveSpace`) and nested space stack support.
- Expose REST endpoints for authoring and querying structure-space topology.
