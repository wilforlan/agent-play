export type { AgentPlaySnapshot } from "./public-types.js";
export type { WorldBounds } from "./lib/world-bounds.js";
export {
  clampWorldPosition,
  boundsContain,
  expandBoundsToMinimumPlayArea,
  MINIMUM_PLAY_WORLD_BOUNDS,
} from "./lib/world-bounds.js";
export {
  type OccupancyGridPoint,
  CONTINUOUS_RENDER_OFFSET,
  OCCUPANCY_POINT_MULTIPLIER,
  DEFAULT_AGENT_SPAWN_MIN_DISTANCE,
  SPATIAL_ZONE_INDEX_AGENTS,
  SPATIAL_ZONE_INDEX_SPACES,
  spatialZoneBounds,
  spatialZoneCenter,
  pointCellInSpatialZone,
  listOccupancyPointsForSpatialZone,
  listAllowedOccupancyPoints,
  occupancyPointsGroupedBySpatialZone,
  occupancyKeyForPosition,
  buildRankedOccupancyPointsForSpatialZone,
  buildRankedOccupancyPoints,
  boundingWorldRectForOccupancyPoints,
  isAgentSpawnOccupancyPointAvailable,
  isSpaceAnchorOccupancyPointAvailable,
} from "./lib/occupancy-grid-model.js";
export {
  mergeSnapshotWithPlayerChainNode,
  parsePlayerChainFanoutNotify,
  parsePlayerChainFanoutNotifyFromSsePayload,
  parsePlayerChainNodeRpcBody,
  sortNodeRefsForSerializedFetch,
} from "./lib/player-chain-merge.js";
export {
  PLAYER_CHAIN_GENESIS_STABLE_KEY,
  PLAYER_CHAIN_HEADER_STABLE_KEY,
} from "./lib/world-chain-keys.js";
