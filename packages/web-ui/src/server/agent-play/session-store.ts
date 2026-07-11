/**
 * @packageDocumentation
 * @module @agent-play/web-ui/server/session-store
 *
 * `SessionStore` interface — the server-side persistence boundary for play
 * sessions. Implementations include {@link ./redis-session-store.ts | the
 * production Redis store} and {@link ./session-store.test-double.ts | the
 * in-memory test double}.
 *
 * **Amenity content and wallets** (added in 3.1.1):
 * - Shop / supermarket / car-wash CRUD: per-space hashes keyed by `id`.
 * - Per-player wallet: lazily seeded at
 *   {@link @agent-play/sdk!DEFAULT_PLAYER_WALLET_BALANCE_USD | $10} on first
 *   read; mutations use `WATCH`/`MULTI` to prevent double-spend.
 * - Purchase records: append-only audit list per player.
 *
 * @see ../../app/api/agent-play/sdk/rpc/route.ts for the RPC handlers that
 *      call this interface.
 * @see ../../../sdk/src/lib/space-content-model.ts for the underlying Zod
 *      schemas.
 */
import type {
  CarWashCar,
  PlayerWallet,
  PurchaseRecord,
  ShopItem,
  SupermarketItem,
  ParkingStreetContent,
  ParkingDurationTier,
  ApplyGameOutcomeInput,
  GameStats,
} from "@agent-play/sdk";
import type { PlayerChainFanoutNotify } from "./player-chain/index.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { SessionEventLogEntry } from "./redis-session-store.js";
import type { GeographyHumanState } from "./world-geography.js";

export type PublishedSessionMetadata = {
  sid: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastSnapshotAt: string | null;
  lastEventAt: string | null;
  snapshotBytes: string | null;
  eventLogLength: number;
  settings: Record<string, string>;
  merkleRootHex: string | null;
  merkleLeafCount: number | null;
};

export type PersistSnapshotRev = {
  rev: number;
  merkleRootHex: string;
  merkleLeafCount: number;
};

export type WorldFanoutOptions = {
  merkleRootHex?: string;
  merkleLeafCount?: number;
  playerChainNotify?: PlayerChainFanoutNotify;
};

export type PresenceLease = {
  playerId: string;
  agentId: string;
  sid: string;
  connectionId: string;
  lastSeenAt: string;
};

export type WorldChatMessage = {
  seq: number;
  requestId: string;
  mainNodeId: string;
  fromPlayerId: string;
  message: string;
  ts: string;
};

export type SpaceAmenityLogEntry = {
  at: string;
  action: string;
  detail?: unknown;
};

export type SessionStore = {
  readonly fanoutDelivery: "redis" | "local";
  readonly playerChainGenesis: string;
  getSessionId(): string;
  loadOrCreateSessionId(): Promise<string>;
  isValidSession(sid: string): Promise<boolean>;
  replaceSessionWithNewSid(newSid: string): Promise<void>;
  clearWorldSnapshot(): Promise<void>;
  getSnapshotJson(): Promise<PreviewSnapshotJson | null>;
  persistSnapshot(snapshot: PreviewSnapshotJson): Promise<void>;
  persistSnapshotReturningRev(
    snapshot: PreviewSnapshotJson
  ): Promise<PersistSnapshotRev>;
  getSnapshotRev(): Promise<number>;
  publishWorldFanout(
    rev: number,
    event: string,
    data: unknown,
    options?: WorldFanoutOptions
  ): Promise<void>;
  getGeographyHumans(): Promise<Map<string, GeographyHumanState>>;
  upsertGeographyHuman(state: GeographyHumanState): Promise<{
    prev: Map<string, GeographyHumanState>;
    next: Map<string, GeographyHumanState>;
  }>;
  removeGeographyHuman(humanId: string): Promise<{
    prev: Map<string, GeographyHumanState>;
    next: Map<string, GeographyHumanState>;
  }>;
  mergeSettings(partial: Record<string, string>): Promise<void>;
  appendEventLog(entry: SessionEventLogEntry): Promise<void>;
  getPublishedMetadata(): Promise<PublishedSessionMetadata>;
  getRecentEventLog(limit: number): Promise<SessionEventLogEntry[]>;
  upsertPresenceLease(input: {
    playerId: string;
    agentId: string;
    sid: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<void>;
  touchPresenceLease(input: {
    playerId: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<boolean>;
  removePresenceLease(input: {
    playerId: string;
    connectionId?: string;
  }): Promise<void>;
  hasPresenceLease(playerId: string): Promise<boolean>;
  listPresenceLeases(): Promise<PresenceLease[]>;
  appendWorldChatMessage(input: {
    requestId: string;
    mainNodeId: string;
    fromPlayerId: string;
    message: string;
    ts: string;
  }): Promise<{ message: WorldChatMessage; totalCount: number }>;
  listWorldChatMessages(input: {
    limit: number;
    beforeSeq?: number;
  }): Promise<{ messages: WorldChatMessage[]; hasMore: boolean; totalCount: number }>;
  appendSpaceAmenityLog(input: {
    spaceId: string;
    amenityKind: string;
    entry: SpaceAmenityLogEntry;
  }): Promise<void>;
  listSpaceAmenityLogs(input: {
    spaceId: string;
    amenityKind?: string;
    limit: number;
  }): Promise<SpaceAmenityLogEntry[]>;
  deleteSpaceSidecar(spaceId: string): Promise<void>;
  /**
   * Persist a shop item under its space-scoped hash. Overwrites by id.
   *
   * @see ../../docs/releases/agent-play-3.1.1.md for the space content flow.
   */
  upsertShopItem(item: ShopItem): Promise<void>;
  listShopItems(spaceId: string): Promise<ShopItem[]>;
  removeShopItem(input: { spaceId: string; itemId: string }): Promise<boolean>;
  upsertSupermarketItem(item: SupermarketItem): Promise<void>;
  listSupermarketItems(spaceId: string): Promise<SupermarketItem[]>;
  removeSupermarketItem(input: {
    spaceId: string;
    itemId: string;
  }): Promise<boolean>;
  upsertCarWashCar(car: CarWashCar): Promise<void>;
  listCarWashCars(spaceId: string): Promise<CarWashCar[]>;
  removeCarWashCar(input: { spaceId: string; carId: string }): Promise<boolean>;
  /**
   * Read (and lazily seed at {@link DEFAULT_PLAYER_WALLET_BALANCE_USD}) the
   * wallet for a player. Concurrent first reads are idempotent.
   */
  getPlayerWallet(playerId: string): Promise<PlayerWallet>;
  getOrCreateAgentWalletForTalkRewards(
    playerId: string
  ): Promise<PlayerWallet>;
  setPlayerWalletBalance(input: {
    playerId: string;
    balanceUsd: number;
  }): Promise<PlayerWallet>;
  /**
   * Atomic balance adjustment. Throws if the resulting balance would be
   * negative.
   */
  adjustPlayerWalletBalance(input: {
    playerId: string;
    deltaUsd: number;
  }): Promise<PlayerWallet>;
  appendPurchaseRecord(record: PurchaseRecord): Promise<void>;
  listPurchases(input: {
    playerId: string;
    limit: number;
  }): Promise<PurchaseRecord[]>;
  /**
   * Atomically claim an amenity content item for a player and decrement their
   * wallet by the item price.
   *
   * @remarks
   * Implementations must perform the claim under `WATCH`/`MULTI` so that two
   * concurrent buyers cannot both succeed. The losing call resolves with
   * `{ ok: false, error: "ITEM_ALREADY_SOLD" }`. If the player has insufficient
   * funds the item is left untouched.
   */
  executePurchase(input: {
    spaceId: string;
    amenityKind: "shop" | "supermarket" | "car_wash";
    itemRef: { kind: "shop" | "supermarket" | "carwash"; id: string };
    playerId: string;
    now: string;
    recordId: string;
    spaceOwnerWalletPlayerId?: string;
  }): Promise<ExecutePurchaseResult>;
  addPowerUps(input: {
    playerId: string;
    amount: number;
    now: string;
  }): Promise<PlayerWallet>;
  redeemWalletBundle(input: {
    playerId: string;
    bundleId: string;
    now: string;
    recordId: string;
  }): Promise<
    | { ok: true; wallet: PlayerWallet; record: PurchaseRecord }
    | { ok: false; error: "INVALID_BUNDLE" | "INSUFFICIENT_POWER_UPS" }
  >;
  getGameStats(input: { playerId: string; now: string }): Promise<GameStats>;
  applyGameOutcome(input: {
    playerId: string;
    outcome: ApplyGameOutcomeInput;
    now: string;
  }): Promise<
    | { ok: true; stats: GameStats; wallet: PlayerWallet; netPu: number }
    | {
        ok: false;
        error: "DUPLICATE_ROUND" | "INVALID_EVENTS" | "CAP_EXCEEDED";
      }
  >;
  startTalkSession(input: {
    viewerNodeId: string;
    agentId: string;
    now: string;
  }): Promise<
    | {
        ok: true;
        startedAt: string;
        ratePerSecondUsd: number;
        wallet: PlayerWallet;
      }
    | { ok: false; error: "ALREADY_ACTIVE" | "INSUFFICIENT_FUNDS" }
  >;
  tickTalkSession(input: {
    viewerNodeId: string;
    agentId: string;
    now: string;
  }): Promise<
    | {
        ok: true;
        secondsBilledThisTick: number;
        secondsBilledTotal: number;
        costUsd: number;
        wallet: PlayerWallet;
      }
    | { ok: false; error: "NO_SESSION" | "INSUFFICIENT_FUNDS" }
  >;
  stopTalkSession(input: {
    viewerNodeId: string;
    agentId: string;
    now: string;
  }): Promise<
    | {
        ok: true;
        totalCostUsd: number;
        secondsBilledTotal: number;
        wallet: PlayerWallet;
      }
    | { ok: false; error: "NO_SESSION" }
  >;
  getParkingStreet(): Promise<ParkingStreetContent>;
  setParkingStreet(content: ParkingStreetContent): Promise<void>;
  buyParkingTicket(input: {
    nodeId: string;
    bay: 1 | 2 | 3 | 4;
    layer?: 1 | 2;
    carPurchaseId: string;
    durationTier: ParkingDurationTier;
    displayNick: string;
    now: string;
    recordId: string;
  }): Promise<BuyParkingTicketResult>;
  tickParkingExpiry(nowIso: string): Promise<ParkingStreetContent>;
};

/**
 * Result of {@link SessionStore.executePurchase}.
 *
 * @remarks
 * `updatedItem` is the post-claim version of the item with `sale.status === "sold"`.
 */
export type ExecutePurchaseResult =
  | {
      ok: true;
      record: PurchaseRecord;
      wallet: PlayerWallet;
      updatedItem: ShopItem | SupermarketItem | CarWashCar;
    }
  | {
      ok: false;
      error:
        | "ITEM_ALREADY_SOLD"
        | "INSUFFICIENT_FUNDS"
        | "ITEM_NOT_FOUND"
        | "AMENITY_KIND_MISMATCH";
    };

export type BuyParkingTicketResult =
  | {
      ok: true;
      record: PurchaseRecord;
      wallet: PlayerWallet;
      parkingStreet: ParkingStreetContent;
    }
  | {
      ok: false;
      error:
        | "NO_WALLET_CAR"
        | "SPOT_OCCUPIED"
        | "PARKING_OWNERSHIP_LIMIT"
        | "PARKING_FOREVER_LIMIT"
        | "INSUFFICIENT_FUNDS"
        | "INVALID_SPOT";
    };
