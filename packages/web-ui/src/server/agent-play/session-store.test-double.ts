/**
 * @packageDocumentation
 * @module @agent-play/web-ui/server/session-store.test-double
 *
 * In-memory mirror of {@link ./redis-session-store.ts | the Redis session
 * store} used in tests. Mirrors every write path including the lazy
 * wallet-seed semantics and double-purchase rejection so unit tests can run
 * the full purchase RPC against a deterministic backend.
 *
 * @see ./session-store.ts for the interface contract.
 */
import { randomUUID } from "node:crypto";
import type {
  CarWashCar,
  PlayerWallet,
  PurchaseRecord,
  ShopItem,
  SupermarketItem,
} from "@agent-play/sdk";
import {
  PurchaseRecordSchema,
  computeTalkAgentPowerUpsEarned,
  createInitialAgentRewardWallet,
  createInitialPlayerWallet,
  costForSeconds,
  getWalletBundleById,
  TALK_PRICE_PER_SECOND_USD,
} from "@agent-play/sdk";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import type { SessionEventLogEntry } from "./redis-session-store.js";
import { getPlayerChainGenesisSync } from "./load-player-chain-genesis.js";
import { buildPlayerChainFromSnapshot } from "./player-chain/index.js";
import { dispatchWorldFanoutLocal } from "./world-fanout-subscriber.js";
import type {
  ExecutePurchaseResult,
  PresenceLease,
  PersistSnapshotRev,
  PublishedSessionMetadata,
  SessionStore,
  SpaceAmenityLogEntry,
  SpaceLeaseRecord,
  WorldChatMessage,
  WorldFanoutOptions,
} from "./session-store.js";

const EVENT_LOG_MAX = 200;
const SPACE_AMENITY_LOG_MAX = 500;

export type TestSessionStoreOptions = {
  playerChainGenesis?: string;
};

export class TestSessionStore implements SessionStore {
  readonly fanoutDelivery = "local" as const;
  readonly playerChainGenesis: string;
  private sid: string | null = null;
  private snapshot: PreviewSnapshotJson | null = null;
  private rev = 0;
  private merkleRootHex: string | null = null;
  private merkleLeafCount: number | null = null;
  private readonly eventLog: SessionEventLogEntry[] = [];
  private readonly settings: Record<string, string> = {};
  private readonly worldChat: WorldChatMessage[] = [];
  private worldChatSeq = 0;
  private readonly presenceLeases = new Map<
    string,
    PresenceLease & { expiresAtMs: number }
  >();
  private readonly spaceAmenityLogs = new Map<string, SpaceAmenityLogEntry[]>();
  private readonly spaceLeases = new Map<string, SpaceLeaseRecord[]>();
  private readonly shopItems = new Map<string, Map<string, ShopItem>>();
  private readonly supermarketItems = new Map<
    string,
    Map<string, SupermarketItem>
  >();
  private readonly carWashCars = new Map<string, Map<string, CarWashCar>>();
  private readonly playerWallets = new Map<string, PlayerWallet>();
  private readonly playerPurchases = new Map<string, PurchaseRecord[]>();
  private readonly talkSessions = new Map<
    string,
    {
      startedAtIso: string;
      lastBilledAtIso: string;
      totalBilledSeconds: number;
      totalChargedUsd: number;
    }
  >();

  constructor(options: TestSessionStoreOptions = {}) {
    this.playerChainGenesis =
      options.playerChainGenesis ?? getPlayerChainGenesisSync();
  }

  getSessionId(): string {
    if (this.sid === null) {
      throw new Error(
        "TestSessionStore.getSessionId: loadOrCreateSessionId not completed"
      );
    }
    return this.sid;
  }

  async loadOrCreateSessionId(): Promise<string> {
    if (this.sid !== null) {
      return this.sid;
    }
    const id = randomUUID();
    this.sid = id;
    return id;
  }

  async isValidSession(sid: string): Promise<boolean> {
    if (sid.length === 0) return false;
    return this.sid !== null && this.sid === sid.trim();
  }

  async replaceSessionWithNewSid(newSid: string): Promise<void> {
    this.sid = newSid;
    this.snapshot = null;
    this.rev = 0;
    this.merkleRootHex = null;
    this.merkleLeafCount = null;
    this.eventLog.length = 0;
    this.worldChat.length = 0;
    this.worldChatSeq = 0;
    for (const k of Object.keys(this.settings)) {
      delete this.settings[k];
    }
    this.talkSessions.clear();
  }

  async clearWorldSnapshot(): Promise<void> {
    this.snapshot = null;
    this.rev = 0;
    this.merkleRootHex = null;
    this.merkleLeafCount = null;
  }

  async appendWorldChatMessage(input: {
    requestId: string;
    mainNodeId: string;
    fromPlayerId: string;
    message: string;
    ts: string;
  }): Promise<{ message: WorldChatMessage; totalCount: number }> {
    this.worldChatSeq += 1;
    const message: WorldChatMessage = {
      seq: this.worldChatSeq,
      requestId: input.requestId,
      mainNodeId: input.mainNodeId,
      fromPlayerId: input.fromPlayerId,
      message: input.message,
      ts: input.ts,
    };
    this.worldChat.unshift(message);
    return { message, totalCount: this.worldChat.length };
  }

  async listWorldChatMessages(input: {
    limit: number;
    beforeSeq?: number;
  }): Promise<{ messages: WorldChatMessage[]; hasMore: boolean; totalCount: number }> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(input.limit)));
    const beforeSeq =
      typeof input.beforeSeq === "number" ? input.beforeSeq : undefined;
    const filtered =
      beforeSeq !== undefined
        ? this.worldChat.filter((m) => m.seq < beforeSeq)
        : this.worldChat;
    const messages = filtered.slice(0, safeLimit).map((m) => ({ ...m }));
    return {
      messages,
      hasMore: filtered.length > safeLimit,
      totalCount: this.worldChat.length,
    };
  }

  async getSnapshotJson(): Promise<PreviewSnapshotJson | null> {
    return this.snapshot;
  }

  async persistSnapshot(snapshot: PreviewSnapshotJson): Promise<void> {
    this.snapshot = snapshot;
    const chain = buildPlayerChainFromSnapshot(
      snapshot,
      this.playerChainGenesis
    );
    this.merkleRootHex = chain.merkleRootHex;
    this.merkleLeafCount = chain.merkleLeafCount;
  }

  async persistSnapshotReturningRev(
    snapshot: PreviewSnapshotJson
  ): Promise<PersistSnapshotRev> {
    this.snapshot = snapshot;
    this.rev += 1;
    const chain = buildPlayerChainFromSnapshot(
      snapshot,
      this.playerChainGenesis
    );
    this.merkleRootHex = chain.merkleRootHex;
    this.merkleLeafCount = chain.merkleLeafCount;
    return {
      rev: this.rev,
      merkleRootHex: chain.merkleRootHex,
      merkleLeafCount: chain.merkleLeafCount,
    };
  }

  async getSnapshotRev(): Promise<number> {
    return this.rev;
  }

  async publishWorldFanout(
    rev: number,
    event: string,
    data: unknown,
    options?: WorldFanoutOptions
  ): Promise<void> {
    const msg: {
      rev: number;
      event: string;
      data: unknown;
      merkleRootHex?: string;
      merkleLeafCount?: number;
      playerChainNotify?: WorldFanoutOptions["playerChainNotify"];
    } = { rev, event, data };
    if (
      options?.merkleRootHex !== undefined &&
      options.merkleRootHex.length > 0
    ) {
      msg.merkleRootHex = options.merkleRootHex;
    }
    if (
      options?.merkleLeafCount !== undefined &&
      Number.isFinite(options.merkleLeafCount)
    ) {
      msg.merkleLeafCount = options.merkleLeafCount;
    }
    if (options?.playerChainNotify !== undefined) {
      msg.playerChainNotify = options.playerChainNotify;
    }
    dispatchWorldFanoutLocal(msg);
  }

  async mergeSettings(partial: Record<string, string>): Promise<void> {
    if (Object.keys(partial).length === 0) return;
    Object.assign(this.settings, partial);
  }

  async appendEventLog(entry: SessionEventLogEntry): Promise<void> {
    this.eventLog.unshift({
      type: entry.type,
      at: entry.at,
      summary: entry.summary.slice(0, 4_000),
    });
    while (this.eventLog.length > EVENT_LOG_MAX) {
      this.eventLog.pop();
    }
  }

  async getPublishedMetadata(): Promise<PublishedSessionMetadata> {
    return {
      sid: this.sid,
      createdAt: null,
      updatedAt: null,
      lastSnapshotAt: null,
      lastEventAt:
        this.eventLog.length > 0 ? (this.eventLog[0]?.at ?? null) : null,
      snapshotBytes:
        this.snapshot !== null
          ? String(Buffer.byteLength(JSON.stringify(this.snapshot), "utf8"))
          : null,
      eventLogLength: this.eventLog.length,
      settings: { ...this.settings },
      merkleRootHex: this.merkleRootHex,
      merkleLeafCount: this.merkleLeafCount,
    };
  }

  async getRecentEventLog(limit: number): Promise<SessionEventLogEntry[]> {
    const n = Math.min(Math.max(limit, 1), EVENT_LOG_MAX);
    return this.eventLog.slice(0, n).map((e) => ({ ...e }));
  }

  private sweepPresence(nowMs: number): void {
    for (const [playerId, lease] of this.presenceLeases.entries()) {
      if (lease.expiresAtMs <= nowMs) {
        this.presenceLeases.delete(playerId);
      }
    }
  }

  async upsertPresenceLease(input: {
    playerId: string;
    agentId: string;
    sid: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<void> {
    const nowMs = Date.now();
    this.sweepPresence(nowMs);
    this.presenceLeases.set(input.playerId, {
      playerId: input.playerId,
      agentId: input.agentId,
      sid: input.sid,
      connectionId: input.connectionId,
      lastSeenAt: new Date(nowMs).toISOString(),
      expiresAtMs: nowMs + Math.max(1, Math.floor(input.ttlSeconds)) * 1000,
    });
  }

  async touchPresenceLease(input: {
    playerId: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<boolean> {
    const nowMs = Date.now();
    this.sweepPresence(nowMs);
    const lease = this.presenceLeases.get(input.playerId);
    if (lease === undefined) {
      return false;
    }
    if (lease.connectionId !== input.connectionId) {
      return false;
    }
    this.presenceLeases.set(input.playerId, {
      ...lease,
      lastSeenAt: new Date(nowMs).toISOString(),
      expiresAtMs: nowMs + Math.max(1, Math.floor(input.ttlSeconds)) * 1000,
    });
    return true;
  }

  async removePresenceLease(input: {
    playerId: string;
    connectionId?: string;
  }): Promise<void> {
    if (input.connectionId === undefined || input.connectionId.length === 0) {
      this.presenceLeases.delete(input.playerId);
      return;
    }
    const lease = this.presenceLeases.get(input.playerId);
    if (lease !== undefined && lease.connectionId === input.connectionId) {
      this.presenceLeases.delete(input.playerId);
    }
  }

  async hasPresenceLease(playerId: string): Promise<boolean> {
    this.sweepPresence(Date.now());
    return this.presenceLeases.has(playerId);
  }

  async listPresenceLeases(): Promise<PresenceLease[]> {
    this.sweepPresence(Date.now());
    return Array.from(this.presenceLeases.values()).map((lease) => ({
      playerId: lease.playerId,
      agentId: lease.agentId,
      sid: lease.sid,
      connectionId: lease.connectionId,
      lastSeenAt: lease.lastSeenAt,
    }));
  }

  private spaceAmenityLogCompositeKey(spaceId: string, kind: string): string {
    return `${spaceId}\u0000${kind}`;
  }

  async appendSpaceAmenityLog(input: {
    spaceId: string;
    amenityKind: string;
    entry: SpaceAmenityLogEntry;
  }): Promise<void> {
    const key = this.spaceAmenityLogCompositeKey(input.spaceId, input.amenityKind);
    const list = this.spaceAmenityLogs.get(key) ?? [];
    list.unshift(input.entry);
    while (list.length > SPACE_AMENITY_LOG_MAX) {
      list.pop();
    }
    this.spaceAmenityLogs.set(key, list);
  }

  async listSpaceAmenityLogs(input: {
    spaceId: string;
    amenityKind?: string;
    limit: number;
  }): Promise<SpaceAmenityLogEntry[]> {
    const lim = Math.min(Math.max(input.limit, 1), SPACE_AMENITY_LOG_MAX);
    if (input.amenityKind !== undefined) {
      const list =
        this.spaceAmenityLogs.get(
          this.spaceAmenityLogCompositeKey(input.spaceId, input.amenityKind)
        ) ?? [];
      return list.slice(0, lim).map((e) => ({ ...e }));
    }
    const merged: SpaceAmenityLogEntry[] = [];
    for (const kind of ["supermarket", "shop", "car_wash"]) {
      merged.push(
        ...(this.spaceAmenityLogs.get(
          this.spaceAmenityLogCompositeKey(input.spaceId, kind)
        ) ?? [])
      );
    }
    merged.sort((a, b) => b.at.localeCompare(a.at));
    return merged.slice(0, lim);
  }

  async upsertSpaceLease(record: SpaceLeaseRecord): Promise<void> {
    const list = this.spaceLeases.get(record.spaceId) ?? [];
    const next = list.filter((l) => l.leaseId !== record.leaseId);
    next.push(record);
    this.spaceLeases.set(record.spaceId, next);
  }

  async listSpaceLeases(spaceId: string): Promise<SpaceLeaseRecord[]> {
    return [...(this.spaceLeases.get(spaceId) ?? [])];
  }

  async deleteSpaceLease(input: {
    spaceId: string;
    leaseId: string;
  }): Promise<boolean> {
    const list = this.spaceLeases.get(input.spaceId);
    if (list === undefined) {
      return false;
    }
    const next = list.filter((l) => l.leaseId !== input.leaseId);
    if (next.length === list.length) {
      return false;
    }
    this.spaceLeases.set(input.spaceId, next);
    return true;
  }

  async deleteSpaceSidecar(spaceId: string): Promise<void> {
    this.spaceLeases.delete(spaceId);
    for (const key of [...this.spaceAmenityLogs.keys()]) {
      if (key.startsWith(`${spaceId}\u0000`)) {
        this.spaceAmenityLogs.delete(key);
      }
    }
    this.shopItems.delete(spaceId);
    this.supermarketItems.delete(spaceId);
    this.carWashCars.delete(spaceId);
  }

  async upsertShopItem(item: ShopItem): Promise<void> {
    const bucket = this.shopItems.get(item.spaceId) ?? new Map<string, ShopItem>();
    bucket.set(item.id, { ...item });
    this.shopItems.set(item.spaceId, bucket);
  }

  async listShopItems(spaceId: string): Promise<ShopItem[]> {
    const bucket = this.shopItems.get(spaceId);
    if (bucket === undefined) return [];
    return Array.from(bucket.values()).map((i) => ({ ...i }));
  }

  async removeShopItem(input: {
    spaceId: string;
    itemId: string;
  }): Promise<boolean> {
    const bucket = this.shopItems.get(input.spaceId);
    if (bucket === undefined) return false;
    return bucket.delete(input.itemId);
  }

  async upsertSupermarketItem(item: SupermarketItem): Promise<void> {
    const bucket =
      this.supermarketItems.get(item.spaceId) ??
      new Map<string, SupermarketItem>();
    bucket.set(item.id, { ...item });
    this.supermarketItems.set(item.spaceId, bucket);
  }

  async listSupermarketItems(spaceId: string): Promise<SupermarketItem[]> {
    const bucket = this.supermarketItems.get(spaceId);
    if (bucket === undefined) return [];
    return Array.from(bucket.values()).map((i) => ({ ...i }));
  }

  async removeSupermarketItem(input: {
    spaceId: string;
    itemId: string;
  }): Promise<boolean> {
    const bucket = this.supermarketItems.get(input.spaceId);
    if (bucket === undefined) return false;
    return bucket.delete(input.itemId);
  }

  async upsertCarWashCar(car: CarWashCar): Promise<void> {
    const bucket =
      this.carWashCars.get(car.spaceId) ?? new Map<string, CarWashCar>();
    bucket.set(car.id, { ...car });
    this.carWashCars.set(car.spaceId, bucket);
  }

  async listCarWashCars(spaceId: string): Promise<CarWashCar[]> {
    const bucket = this.carWashCars.get(spaceId);
    if (bucket === undefined) return [];
    return Array.from(bucket.values()).map((c) => ({ ...c }));
  }

  async removeCarWashCar(input: {
    spaceId: string;
    carId: string;
  }): Promise<boolean> {
    const bucket = this.carWashCars.get(input.spaceId);
    if (bucket === undefined) return false;
    return bucket.delete(input.carId);
  }

  async getPlayerWallet(playerId: string): Promise<PlayerWallet> {
    const existing = this.playerWallets.get(playerId);
    if (existing !== undefined) {
      return { ...existing };
    }
    const seeded = createInitialPlayerWallet({
      playerId,
      now: new Date().toISOString(),
    });
    this.playerWallets.set(playerId, seeded);
    return { ...seeded };
  }

  async getOrCreateAgentWalletForTalkRewards(
    playerId: string
  ): Promise<PlayerWallet> {
    const existing = this.playerWallets.get(playerId);
    if (existing !== undefined) {
      return { ...existing };
    }
    const seeded = createInitialAgentRewardWallet({
      playerId,
      now: new Date().toISOString(),
    });
    this.playerWallets.set(playerId, seeded);
    return { ...seeded };
  }

  async setPlayerWalletBalance(input: {
    playerId: string;
    balanceUsd: number;
  }): Promise<PlayerWallet> {
    if (input.balanceUsd < 0 || !Number.isFinite(input.balanceUsd)) {
      throw new Error(
        "setPlayerWalletBalance: balanceUsd must be a finite, non-negative number"
      );
    }
    const wallet: PlayerWallet = {
      ...(await this.getPlayerWallet(input.playerId)),
      balanceUsd: input.balanceUsd,
      updatedAt: new Date().toISOString(),
    };
    this.playerWallets.set(input.playerId, wallet);
    return { ...wallet };
  }

  async adjustPlayerWalletBalance(input: {
    playerId: string;
    deltaUsd: number;
  }): Promise<PlayerWallet> {
    const current = await this.getPlayerWallet(input.playerId);
    const next = current.balanceUsd + input.deltaUsd;
    if (next < 0 || !Number.isFinite(next)) {
      throw new Error(
        `adjustPlayerWalletBalance: insufficient funds for player ${input.playerId}`
      );
    }
    const wallet: PlayerWallet = {
      ...current,
      balanceUsd: next,
      updatedAt: new Date().toISOString(),
    };
    this.playerWallets.set(input.playerId, wallet);
    return { ...wallet };
  }

  async appendPurchaseRecord(record: PurchaseRecord): Promise<void> {
    const list = this.playerPurchases.get(record.playerId) ?? [];
    list.unshift({ ...record });
    this.playerPurchases.set(record.playerId, list);
  }

  async listPurchases(input: {
    playerId: string;
    limit: number;
  }): Promise<PurchaseRecord[]> {
    const list = this.playerPurchases.get(input.playerId) ?? [];
    const lim = Math.max(1, Math.min(500, Math.floor(input.limit)));
    return list.slice(0, lim).map((r) => ({ ...r }));
  }

  async executePurchase(input: {
    spaceId: string;
    amenityKind: "shop" | "supermarket" | "car_wash";
    itemRef: { kind: "shop" | "supermarket" | "carwash"; id: string };
    playerId: string;
    now: string;
    recordId: string;
  }): Promise<ExecutePurchaseResult> {
    const expectedKind: typeof input.itemRef.kind =
      input.amenityKind === "car_wash" ? "carwash" : input.amenityKind;
    if (input.itemRef.kind !== expectedKind) {
      return { ok: false, error: "AMENITY_KIND_MISMATCH" };
    }
    let bucket:
      | Map<string, ShopItem>
      | Map<string, SupermarketItem>
      | Map<string, CarWashCar>
      | undefined;
    if (input.itemRef.kind === "shop") {
      bucket = this.shopItems.get(input.spaceId);
    } else if (input.itemRef.kind === "supermarket") {
      bucket = this.supermarketItems.get(input.spaceId);
    } else {
      bucket = this.carWashCars.get(input.spaceId);
    }
    const item = bucket?.get(input.itemRef.id);
    if (item === undefined) {
      return { ok: false, error: "ITEM_NOT_FOUND" };
    }
    if (item.sale.status !== "available") {
      return { ok: false, error: "ITEM_ALREADY_SOLD" };
    }
    const wallet = await this.getPlayerWallet(input.playerId);
    if (wallet.balanceUsd < item.priceUsd) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }
    const nextItem = {
      ...item,
      sale: {
        status: "sold" as const,
        soldToPlayerId: input.playerId,
        soldAt: input.now,
      },
    };
    if (input.itemRef.kind === "shop") {
      (bucket as Map<string, ShopItem>).set(item.id, nextItem as ShopItem);
    } else if (input.itemRef.kind === "supermarket") {
      (bucket as Map<string, SupermarketItem>).set(
        item.id,
        nextItem as SupermarketItem
      );
    } else {
      (bucket as Map<string, CarWashCar>).set(item.id, nextItem as CarWashCar);
    }
    const earnedPowerUps = Math.floor(item.priceUsd) * 3;
    const nextWallet: PlayerWallet = {
      ...wallet,
      balanceUsd: wallet.balanceUsd - item.priceUsd,
      powerUps: (wallet.powerUps ?? 0) + earnedPowerUps,
      updatedAt: input.now,
    };
    this.playerWallets.set(input.playerId, nextWallet);
    const record: PurchaseRecord = {
      id: input.recordId,
      playerId: input.playerId,
      spaceId: input.spaceId,
      amenityKind: input.amenityKind,
      itemRef: input.itemRef,
      priceUsd: item.priceUsd,
      at: input.now,
    };
    await this.appendPurchaseRecord(record);
    return {
      ok: true,
      record,
      wallet: nextWallet,
      updatedItem: nextItem,
    };
  }

  private talkSessionMapKey(viewerNodeId: string, agentId: string): string {
    return `${viewerNodeId}\u001f${agentId}`;
  }

  async addPowerUps(input: {
    playerId: string;
    amount: number;
    now: string;
  }): Promise<PlayerWallet> {
    if (
      !Number.isFinite(input.amount) ||
      !Number.isInteger(input.amount) ||
      input.amount <= 0
    ) {
      throw new Error(
        "addPowerUps: amount must be a finite positive integer"
      );
    }
    const current = await this.getPlayerWallet(input.playerId);
    const next: PlayerWallet = {
      ...current,
      powerUps: (current.powerUps ?? 0) + input.amount,
      updatedAt: input.now,
    };
    this.playerWallets.set(input.playerId, next);
    return { ...next };
  }

  async redeemWalletBundle(input: {
    playerId: string;
    bundleId: string;
    now: string;
    recordId: string;
  }): Promise<
    | { ok: true; wallet: PlayerWallet; record: PurchaseRecord }
    | { ok: false; error: "INVALID_BUNDLE" | "INSUFFICIENT_POWER_UPS" }
  > {
    const bundle = getWalletBundleById(input.bundleId.trim());
    if (bundle === undefined) {
      return { ok: false, error: "INVALID_BUNDLE" };
    }
    const wallet = await this.getPlayerWallet(input.playerId);
    const pu = wallet.powerUps ?? 0;
    if (pu < bundle.powerUpsCost) {
      return { ok: false, error: "INSUFFICIENT_POWER_UPS" };
    }
    const nextBalance = wallet.balanceUsd + bundle.creditUsd;
    if (!Number.isFinite(nextBalance) || nextBalance < 0) {
      return { ok: false, error: "INVALID_BUNDLE" };
    }
    const updatedWallet: PlayerWallet = {
      ...wallet,
      balanceUsd: nextBalance,
      powerUps: pu - bundle.powerUpsCost,
      updatedAt: input.now,
    };
    this.playerWallets.set(input.playerId, updatedWallet);
    const record: PurchaseRecord = PurchaseRecordSchema.parse({
      id: input.recordId,
      playerId: input.playerId,
      spaceId: "__wallet__",
      amenityKind: "wallet_bundle",
      itemRef: { kind: "shop", id: bundle.id },
      priceUsd: bundle.creditUsd,
      at: input.now,
      detail: `Exchanged ${String(bundle.powerUpsCost)} power-ups for $${String(bundle.creditUsd)} balance`,
      powerUpsSpent: bundle.powerUpsCost,
    });
    await this.appendPurchaseRecord(record);
    return { ok: true, wallet: updatedWallet, record };
  }

  async startTalkSession(input: {
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
  > {
    const key = this.talkSessionMapKey(input.viewerNodeId, input.agentId);
    if (this.talkSessions.has(key)) {
      return { ok: false, error: "ALREADY_ACTIVE" };
    }
    const wallet = await this.getPlayerWallet(input.viewerNodeId);
    if (wallet.balanceUsd <= 0) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }
    this.talkSessions.set(key, {
      startedAtIso: input.now,
      lastBilledAtIso: input.now,
      totalBilledSeconds: 0,
      totalChargedUsd: 0,
    });
    return {
      ok: true,
      startedAt: input.now,
      ratePerSecondUsd: TALK_PRICE_PER_SECOND_USD,
      wallet: { ...wallet },
    };
  }

  async tickTalkSession(input: {
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
  > {
    await this.getOrCreateAgentWalletForTalkRewards(input.agentId);
    const key = this.talkSessionMapKey(input.viewerNodeId, input.agentId);
    const session = this.talkSessions.get(key);
    if (session === undefined) {
      return { ok: false, error: "NO_SESSION" };
    }
    const wallet = await this.getPlayerWallet(input.viewerNodeId);
    const agentWallet = await this.getOrCreateAgentWalletForTalkRewards(
      input.agentId
    );
    const elapsedMs =
      Date.parse(input.now) - Date.parse(session.lastBilledAtIso);
    const billSeconds =
      elapsedMs > 0 ? Math.ceil(elapsedMs / 1000) : 0;
    const costUsd = costForSeconds(billSeconds);
    if (costUsd > wallet.balanceUsd) {
      this.talkSessions.delete(key);
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }
    const nextWallet: PlayerWallet = {
      ...wallet,
      balanceUsd: wallet.balanceUsd - costUsd,
      updatedAt: input.now,
    };
    const agentPuEarned = computeTalkAgentPowerUpsEarned({
      billedWholeSeconds: billSeconds,
      costUsd,
    });
    const nextAgentWallet: PlayerWallet = {
      ...agentWallet,
      powerUps: Math.max(0, (agentWallet.powerUps ?? 0) + agentPuEarned),
      updatedAt: input.now,
    };
    const nextSession = {
      ...session,
      lastBilledAtIso: input.now,
      totalBilledSeconds: session.totalBilledSeconds + billSeconds,
      totalChargedUsd: session.totalChargedUsd + costUsd,
    };
    this.playerWallets.set(input.viewerNodeId, nextWallet);
    this.playerWallets.set(input.agentId, nextAgentWallet);
    this.talkSessions.set(key, nextSession);
    if (costUsd > 0) {
      const record = PurchaseRecordSchema.parse({
        id: `talk-${randomUUID()}`,
        playerId: input.viewerNodeId,
        spaceId: "__talk__",
        amenityKind: "talk_time",
        itemRef: { kind: "shop", id: "openai-realtime" },
        priceUsd: costUsd,
        at: input.now,
        detail: `Realtime voice · ${String(billSeconds)}s · agent ${input.agentId}`,
      });
      await this.appendPurchaseRecord(record);
    }
    return {
      ok: true,
      secondsBilledThisTick: billSeconds,
      secondsBilledTotal: nextSession.totalBilledSeconds,
      costUsd,
      wallet: { ...nextWallet },
    };
  }

  async stopTalkSession(input: {
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
  > {
    await this.getOrCreateAgentWalletForTalkRewards(input.agentId);
    const key = this.talkSessionMapKey(input.viewerNodeId, input.agentId);
    const session = this.talkSessions.get(key);
    if (session === undefined) {
      return { ok: false, error: "NO_SESSION" };
    }
    const wallet = await this.getPlayerWallet(input.viewerNodeId);
    const agentWallet = await this.getOrCreateAgentWalletForTalkRewards(
      input.agentId
    );
    const elapsedMs =
      Date.parse(input.now) - Date.parse(session.lastBilledAtIso);
    const billSeconds =
      elapsedMs > 0 ? Math.ceil(elapsedMs / 1000) : 0;
    const finalCostUsd = costForSeconds(billSeconds);
    this.talkSessions.delete(key);
    if (finalCostUsd > wallet.balanceUsd) {
      return {
        ok: true,
        totalCostUsd: session.totalChargedUsd,
        secondsBilledTotal: session.totalBilledSeconds,
        wallet: { ...wallet },
      };
    }
    const nextWallet: PlayerWallet = {
      ...wallet,
      balanceUsd: wallet.balanceUsd - finalCostUsd,
      updatedAt: input.now,
    };
    const agentPuEarned = computeTalkAgentPowerUpsEarned({
      billedWholeSeconds: billSeconds,
      costUsd: finalCostUsd,
    });
    const nextAgentWallet: PlayerWallet = {
      ...agentWallet,
      powerUps: Math.max(0, (agentWallet.powerUps ?? 0) + agentPuEarned),
      updatedAt: input.now,
    };
    this.playerWallets.set(input.viewerNodeId, nextWallet);
    this.playerWallets.set(input.agentId, nextAgentWallet);
    if (finalCostUsd > 0) {
      const record = PurchaseRecordSchema.parse({
        id: `talk-${randomUUID()}`,
        playerId: input.viewerNodeId,
        spaceId: "__talk__",
        amenityKind: "talk_time",
        itemRef: { kind: "shop", id: "openai-realtime" },
        priceUsd: finalCostUsd,
        at: input.now,
        detail: `Realtime voice · ${String(billSeconds)}s · agent ${input.agentId}`,
      });
      await this.appendPurchaseRecord(record);
    }
    return {
      ok: true,
      totalCostUsd: session.totalChargedUsd + finalCostUsd,
      secondsBilledTotal: session.totalBilledSeconds + billSeconds,
      wallet: { ...nextWallet },
    };
  }
}
