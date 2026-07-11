/**
 * @packageDocumentation
 * Public entry for **@agent-play/sdk** (Node.js and browser `browser` export).
 *
 * **Primary APIs**
 * - {@link RemotePlayWorld} — HTTP client: load **`nodeCredentials`** (`rootKey`, human **`passw`**) from **`~/.agent-play/credentials.json`** via **@agent-play/node-tools**, then **`connect`**, **`getWorldSnapshot`**, **`addAgent`**, **`subscribeIntercomCommands`** (for automation agents handling intercom **`forwarded`** commands), **`recordInteraction`**, **`recordJourney`**, **`registerMcp`**, **`hold`**, **`onClose`**.
 * - {@link langchainRegistration} — build LangChain **`agent`** payloads for **`addAgent`**.
 * - {@link clampWorldPosition}, {@link WorldBounds} — shared world bounds for server and canvas.
 *
 * **Events** — Session and world events: {@link WORLD_INTERACTION_EVENT}, {@link SESSION_CONNECTED_EVENT}, and related symbols from this module.
 *
 * **Transport** — **`RemotePlayWorld`** uses `fetch`; **`subscribeWorldState`** consumes SSE **`playerChainNotify`** and **`getPlayerChainNode`** for incremental merges.
 *
 * **Wire note** — Fanout and SSE use **`playerChainNotify`** (node references). Legacy **`playerChainDelta`**-style digests on the wire are not used; use **`getWorldSnapshot`** if you need a full snapshot only.
 */

export type {
  AddAgentInput,
  AddPlayerInput,
  AgentPlaySnapshot,
  AgentPlayWorldLayout,
  AgentPlayWorldLayoutZone,
  AgentPlayWorldMap,
  AgentPlayWorldMapAgentOccupant,
  AgentPlayWorldMapBounds,
  AgentPlayWorldMapMcpOccupant,
  AssistToolFieldType,
  AssistToolParameterSpec,
  AssistToolSpec,
  LangChainAgentRegistration,
  P2aEnableFlag,
  PlayerChainFanoutNotify,
  PlayerChainGenesisNode,
  PlayerChainHeaderNode,
  PlayerChainNodeResponse,
  PlayerChainNotifyNodeRef,
  PlayerChainOccupantPresentNode,
  PlayerChainOccupantRemovedNode,
  PlayAgentInformation,
  PlatformAgentInformation,
  RecordInteractionInput,
  RealtimeWebrtcClientSecret,
  RemotePlayWorldInitAudioOptions,
  RemotePlayWorldOpenAiAudioOptions,
  RegisteredAgentSummary,
  RegisteredPlayer,
  WorldInteractionRole,
  YieldEventInfo,
  ZoneEventInfo,
} from "./public-types.js";
export type {
  DestinationJourneyStep,
  Journey,
  JourneyStep,
  OriginJourneyStep,
  PositionedStep,
  StructureJourneyStep,
  WorldJourneyUpdate,
} from "./public-types.js";
export {
  PLAYER_ADDED_EVENT,
  SESSION_CLOSED_EVENT,
  SESSION_CONNECTED_EVENT,
  SESSION_INVALID_EVENT,
  SESSION_SSE_ERROR_EVENT,
  SESSION_SSE_OPEN_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_GEOGRAPHY_EVENT,
  type RemotePlayWorldSessionEvent,
  type WorldAgentSignalPayload,
  type WorldInteractionPayload,
} from "./world-events.js";
export {
  clampWorldPosition,
  boundsContain,
  expandBoundsToMinimumPlayArea,
  MINIMUM_PLAY_WORLD_BOUNDS,
  MINIMUM_STREET_LAYOUT_BOUNDS,
  COLUMN_STREET_ROW_HEIGHT,
  PARKING_COLUMN_GAP_ROWS,
  PARKING_STREET_ROW_HEIGHT,
  DEFAULT_LAYOUT_BOUNDS_WITH_PARKING,
  parkingZoneMinYFromColumnBase,
  parkingZoneMaxYFromColumnBase,
  type WorldBounds,
} from "./lib/world-bounds.js";
export {
  type OccupancyGridPoint,
  CONTINUOUS_RENDER_OFFSET,
  OCCUPANCY_POINT_MULTIPLIER,
  DEFAULT_AGENT_SPAWN_MIN_DISTANCE,
  SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE,
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
  createWorldLayoutWithParkingRow,
  migrateLayoutToParkingRow,
  layoutNeedsParkingColumnGapMigration,
  migrateLayoutToParkingColumnGap,
  layoutHasParkingZone,
  migrateWorldLayoutBounds,
  applyBoundsFieldUpdateToLayout,
  type WorldLayoutBoundsField,
} from "./lib/world-layout-model.js";
export {
  agentPlayDebug,
  configureAgentPlayDebug,
  isAgentPlayDebugEnabled,
  resetAgentPlayDebug,
} from "./lib/agent-play-debug.js";
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
  ParkingDurationTierSchema,
  ParkingSpotSchema,
  ParkingStreetContentSchema,
  createEmptyParkingStreetContent,
  findParkingSpot,
  listActiveParkingOccupancies,
  PARKING_BAY_COUNT,
  PARKING_LAYERS_PER_BAY,
  PARKING_SPOT_COUNT,
  type ParkingSpot,
  type ParkingOccupant,
  type ParkingStreetContent,
} from "./lib/parking-content-model.js";
export {
  HOUSE_CATALOG,
  HOUSE_WORLD_X,
  HouseIdSchema,
  HouseSlotSchema,
  HouseStreetContentSchema,
  PARKING_HOUSE_COUNT,
  createEmptyHouseStreetContent,
  findHouseSlot,
  housePurchaseDetail,
  isHouseOwned,
  type HouseId,
  type HouseSlot,
  type HouseStreetContent,
} from "./lib/house-content-model.js";
export {
  HOUSE_BLUEPRINTS,
  clampHousePosition,
  getHouseBlueprint,
  houseSpawnPosition,
  layoutHouseFixtures,
  type HouseBlueprint,
  type HouseFixtureKind,
  type HouseFixtureSlot,
  type HouseStageBounds,
} from "./lib/house-layout-model.js";
export {
  DEFAULT_PARKING_RATES_USD,
  PARKING_DURATION_TIERS,
  computeParkingExpiresAt,
  effectiveHourlyRateUsd,
  isParkingOccupantActive,
} from "./lib/parking-pricing.js";
export {
  canNodeAcquireParkingSpot,
  MAX_SLOTS_WITH_FOREVER,
  MAX_TIMED_PARKING_SLOTS_PER_NODE,
  type ParkingDurationTier,
  type ParkingOccupancyRef,
  type ParkingOwnershipError,
} from "./lib/parking-ownership.js";
export {
  APU_TOKEN,
  buildAmenityPurchaseApuFields,
  buildApuWalletTransaction,
  buildWalletBundleApuFields,
} from "./lib/wallet-apu-transaction.js";
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
  GAME_CABINET_CATALOG,
  PLAYABLE_GAME_IDS,
  featuredGameIdForUtcDate,
  getGameCabinetByGameId,
  getGameCabinetById,
  isGameId,
  type GameCabinetEntry,
  type GameId,
} from "./lib/game-catalog.js";
export {
  ApplyGameOutcomeInputSchema,
  DAILY_GAME_PU_CAP,
  GameEventSchema,
  GamePerTitleStatsSchema,
  GameStatsSchema,
  STREAK_BONUS_PU,
  STREAK_BONUS_THRESHOLD_DAYS,
  computeEventPuDelta,
  computeRoundPuDelta,
  createEmptyGameStats,
  utcDateKey,
  type ApplyGameOutcomeInput,
  type GameEvent,
  type GamePerTitleStats,
  type GameStats,
} from "./lib/game-outcome-model.js";
export {
  ScannerBlockRecordSchema,
  ScannerHeadSchema,
  ScannerMigrationStateSchema,
  ScannerMigrationStatusSchema,
  ScannerNodeProfileSchema,
  ScannerTxOpSchema,
  ScannerTxRecordSchema,
  ScannerWalletSnapshotSchema,
  type ScannerBlockRecord,
  type ScannerHead,
  type ScannerMigrationState,
  type ScannerMigrationStatus,
  type ScannerNodeProfile,
  type ScannerTxOp,
  type ScannerTxRecord,
  type ScannerWalletSnapshot,
} from "./lib/scanner-model.js";
export {
  ANALYTICS_EVENT_NAMES,
  AnalyticsContextSchema,
  AnalyticsEventSchema,
  AnalyticsMigrationStateSchema,
  AnalyticsPropertyValueSchema,
  AnalyticsTraitsSchema,
  type AnalyticsContext,
  type AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsMigrationState,
  type AnalyticsPropertyValue,
  type AnalyticsTraits,
} from "./lib/analytics-event-model.js";
export { langchainRegistration } from "./platforms/langchain.js";
export {
  RemotePlayWorld,
  type IntercomToolExecutor,
  type RemotePlayWorldConnectOptions,
  type RemotePlayWorldHold,
  type RemotePlayWorldLogging,
  type RemotePlayWorldNodeCredentials,
  type RemotePlayWorldOptions,
  type SubscribeIntercomCommandsOptions,
} from "./lib/remote-play-world.js";
export { intercomResultRecordFromLangChainInvokeOutput } from "./lib/intercom-langchain-chat-result.js";
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
export {
  type AgentPlayAgentNodeEntry,
  type AgentPlayCredentialsFile,
  type NodeCredentialMaterial,
  createNodeCredentialMaterial,
  loadAgentPlayCredentialsFileFromPath,
  loadAgentPlayCredentialsFileFromPathSync,
  loadRootKey,
  nodeCredentialFromHumanPhrase,
  nodeCredentialFromPasswHash,
  nodeCredentialsMaterialFromHumanPassphrase,
  parseAgentPlayCredentialsJson,
  resolveAgentPlayCredentialsPath,
  verifyStoredNodeCredential,
} from "@agent-play/node-tools";
