export type { AgentPlaySnapshot, AgentPlayWorldLayout } from "./public-types.js";
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
  pointCellInRect,
  listOccupancyPointsInRect,
  listOccupancyPointsForSpatialZone,
  listAllowedOccupancyPoints,
  occupancyPointsGroupedBySpatialZone,
  occupancyKeyForPosition,
  buildRankedOccupancyPointsInRect,
  buildRankedOccupancyPointsForSpatialZone,
  buildRankedOccupancyPoints,
  boundingWorldRectForOccupancyPoints,
  isAgentSpawnOccupancyPointAvailableInRect,
  isSpaceAnchorOccupancyPointAvailableInRect,
  isAgentSpawnOccupancyPointAvailable,
  isSpaceAnchorOccupancyPointAvailable,
} from "./lib/occupancy-grid-model.js";
export {
  STREET_NAME_POOL,
  type StreetPoolEntry,
  getStreetPoolEntryById,
} from "./lib/world-streets-pool.js";
export {
  type OccupantGroup,
  type Street,
  type Zone,
  type WorldLayout,
  streetFromPoolEntry,
  zonesForGroup,
  primaryZoneForGroup,
  enumerateIntegerCellsInRect,
  cellsForZone,
  centerOfZone,
  pointCellInZone,
  listOccupancyPointsForZone,
  buildRankedOccupancyPointsForZone,
  occupancyPointsGroupedByZones,
  nextStreetFromPool,
  pickZoneForGroup,
  availableCellsForZone,
  isAgentSpawnOccupancyPointAvailableInZone,
  isSpaceAnchorOccupancyPointAvailableInZone,
  createVerticalStripSeedLayout,
  migrateWorldLayoutBounds,
  applyBoundsFieldUpdateToLayout,
  type WorldLayoutBoundsField,
} from "./lib/world-layout-model.js";
export {
  CarWashCarSchema,
  DEFAULT_PLAYER_WALLET_BALANCE_USD,
  PlayerWalletSchema,
  PurchaseRecordSchema,
  SaleStateSchema,
  ShopItemSchema,
  SupermarketItemSchema,
  createInitialPlayerWallet,
  createInitialAgentRewardWallet,
  desaturateColor,
  isItemAvailableForPurchase,
  type CarWashCar,
  type PlayerWallet,
  type PurchaseRecord,
  type SaleState,
  type ShopItem,
  type SpaceContentItem,
  type SupermarketItem,
} from "./lib/space-content-model.js";
export {
  TALK_PRICE_PER_60S_USD,
  TALK_PRICE_PER_SECOND_USD,
  TALK_TICK_SECONDS,
  costForSeconds,
} from "./lib/talk-billing.js";
export {
  TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT,
  TALK_AGENT_PU_MAX_PER_LEG,
  computeTalkAgentPowerUpsEarned,
  type ComputeTalkAgentPowerUpsEarnedInput,
} from "./lib/talk-agent-reward.js";
export {
  WALLET_BUNDLE_OFFERS,
  getWalletBundleById,
  type WalletBundleId,
  type WalletBundleOffer,
} from "./lib/wallet-bundle-catalog.js";
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
