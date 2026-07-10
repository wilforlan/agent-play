/**
 * @packageDocumentation
 * @module @agent-play/web-ui/server/redis-session-store
 *
 * Production Redis-backed implementation of {@link ./session-store.ts |
 * `SessionStore`}. All amenity-content writes are stored under
 * `agent-play:${hostId}:space:${spaceId}:{shop-items|supermarket-items|carwash-cars}`
 * hashes; wallets and purchase records live under
 * `agent-play:${hostId}:player:${playerId}:{wallet,purchases}`.
 *
 * **Atomicity** — `getPlayerWallet`, `setPlayerWalletBalance`,
 * `adjustPlayerWalletBalance`, and `purchase` all use `WATCH`/`MULTI` so
 * concurrent first-reads / purchases cannot race past each other. First-time
 * wallet reads atomically seed the balance to
 * {@link @agent-play/sdk!DEFAULT_PLAYER_WALLET_BALANCE_USD | $70}.
 *
 * @see ./session-store.test-double.ts for the in-memory mirror used in tests.
 */
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import type {
  CarWashCar,
  PlayerWallet,
  PurchaseRecord,
  ShopItem,
  SupermarketItem,
} from "@agent-play/sdk";
import {
  ApplyGameOutcomeInputSchema,
  CarWashCarSchema,
  PlayerWalletSchema,
  PurchaseRecordSchema,
  ShopItemSchema,
  SupermarketItemSchema,
  TALK_PRICE_PER_SECOND_USD,
  computeTalkAgentPowerUpsEarned,
  createInitialAgentRewardWallet,
  createInitialPlayerWallet,
  costForSeconds,
  getWalletBundleById,
} from "@agent-play/sdk";
import {
  applyGameOutcomeToState,
  createInitialGamePlayerState,
  deserializeGamePlayerState,
  getGameStatsFromState,
  serializeGamePlayerState,
} from "./game-outcome-store.js";
import { agentPlayVerbose } from "./agent-play-debug.js";
import { finiteOccupantPosition } from "./agent-journey-cell.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import { getPlayerChainGenesisSync } from "./load-player-chain-genesis.js";
import {
  buildLeafFieldMapFromSnapshot,
  buildPlayerChainFromSnapshot,
  playerChainLeavesKey,
} from "./player-chain/index.js";
import { worldFanoutChannel } from "./redis-world-fanout.js";
import {
  GEOGRAPHY_REDIS_TTL_SECONDS,
  parseGeographyHumanState,
  type GeographyHumanState,
} from "./world-geography.js";
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

const PURCHASES_MAX = 500;

const EVENT_LOG_MAX = 200;
const WORLD_CHAT_MAX = 5000;
const SPACE_AMENITY_LOG_MAX = 500;

function sessionHashKey(hostId: string): string {
  return `agent-play:${hostId}:session`;
}

function snapshotKey(hostId: string): string {
  return `agent-play:${hostId}:session:snapshot`;
}

function eventLogKey(hostId: string): string {
  return `agent-play:${hostId}:session:eventlog`;
}

function settingsHashKey(hostId: string): string {
  return `agent-play:${hostId}:session:settings`;
}

function worldChatKey(hostId: string): string {
  return `agent-play:${hostId}:session:world-chat`;
}

function gridOccupiedKey(hostId: string): string {
  return `agent-play:${hostId}:session:grid:occupied`;
}

function presenceLeaseKey(hostId: string, playerId: string): string {
  return `agent-play:${hostId}:presence:${playerId}`;
}

function geographyHumansKey(hostId: string, sid: string): string {
  return `agent-play:${hostId}:geography:${sid}`;
}

function spaceAmenityLogKey(
  hostId: string,
  spaceId: string,
  kind: string
): string {
  return `agent-play:${hostId}:space:${spaceId}:amenity:${kind}:log`;
}

function spaceLeasesHashKey(hostId: string, spaceId: string): string {
  return `agent-play:${hostId}:space:${spaceId}:leases`;
}

function spaceShopItemsHashKey(hostId: string, spaceId: string): string {
  return `agent-play:${hostId}:space:${spaceId}:shop-items`;
}

function spaceSupermarketItemsHashKey(hostId: string, spaceId: string): string {
  return `agent-play:${hostId}:space:${spaceId}:supermarket-items`;
}

function spaceCarWashCarsHashKey(hostId: string, spaceId: string): string {
  return `agent-play:${hostId}:space:${spaceId}:carwash-cars`;
}

function playerWalletKey(hostId: string, playerId: string): string {
  return `agent-play:${hostId}:player:${playerId}:wallet`;
}

function playerGameStateKey(hostId: string, playerId: string): string {
  return `agent-play:${hostId}:player:${playerId}:game-state`;
}

function talkSessionKey(
  hostId: string,
  viewerNodeId: string,
  agentId: string
): string {
  return `agent-play:${hostId}:talk:${viewerNodeId}:${agentId}`;
}

type TalkSessionStored = {
  startedAtIso: string;
  lastBilledAtIso: string;
  totalBilledSeconds: number;
  totalChargedUsd: number;
};

function parseTalkSessionStored(raw: string): TalkSessionStored | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.startedAtIso !== "string" ||
      typeof o.lastBilledAtIso !== "string" ||
      typeof o.totalBilledSeconds !== "number"
    ) {
      return null;
    }
    const totalChargedUsd =
      typeof o.totalChargedUsd === "number" ? o.totalChargedUsd : 0;
    return {
      startedAtIso: o.startedAtIso,
      lastBilledAtIso: o.lastBilledAtIso,
      totalBilledSeconds: o.totalBilledSeconds,
      totalChargedUsd,
    };
  } catch {
    return null;
  }
}

function playerPurchasesKey(hostId: string, playerId: string): string {
  return `agent-play:${hostId}:player:${playerId}:purchases`;
}

export type RedisSessionStoreOptions = {
  redis: Redis;
  hostId: string;
  previewBaseUrl?: string;
  playerChainGenesis?: string;
};

export type SessionEventLogEntry = {
  type: string;
  at: string;
  summary: string;
};

export class RedisSessionStore implements SessionStore {
  readonly fanoutDelivery = "redis" as const;
  readonly playerChainGenesis: string;
  private readonly redis: Redis;
  private readonly hostId: string;
  private readonly previewBaseUrl: string | undefined;
  private cachedSid: string | null = null;

  constructor(options: RedisSessionStoreOptions) {
    this.redis = options.redis;
    this.hostId = options.hostId;
    this.previewBaseUrl = options.previewBaseUrl;
    this.playerChainGenesis =
      options.playerChainGenesis ?? getPlayerChainGenesisSync();
  }

  getSessionId(): string {
    if (this.cachedSid === null || this.cachedSid.length === 0) {
      throw new Error(
        "RedisSessionStore.getSessionId: loadOrCreateSessionId not completed"
      );
    }
    return this.cachedSid;
  }

  private appendSnapshotAndGridToMulti(
    chain: ReturnType<Redis["multi"]>,
    snapshot: PreviewSnapshotJson,
    raw: string
  ): void {
    const key = snapshotKey(this.hostId);
    const gridKey = gridOccupiedKey(this.hostId);
    const coordKeys = snapshot.worldMap.occupants.flatMap((o) => {
      const position = finiteOccupantPosition(o);
      if (position === null) {
        return [];
      }
      return [`${Math.round(position.x)},${Math.round(position.y)}`];
    });
    chain.set(key, raw);
    chain.del(gridKey);
    if (coordKeys.length > 0) {
      chain.sadd(gridKey, ...coordKeys);
    }
  }

  private appendPlayerChainLeavesToMulti(
    chain: ReturnType<Redis["multi"]>,
    snapshot: PreviewSnapshotJson
  ): void {
    const leavesKey = playerChainLeavesKey(this.hostId);
    const fields = buildLeafFieldMapFromSnapshot(
      snapshot,
      this.playerChainGenesis
    );
    chain.del(leavesKey);
    const fieldCount = Object.keys(fields).length;
    if (fieldCount > 0) {
      chain.hset(leavesKey, fields);
    }
    agentPlayVerbose("redis-session", "appendPlayerChainLeavesToMulti", {
      hostId: this.hostId,
      leavesKey,
      leafFieldCount: fieldCount,
    });
  }

  async loadOrCreateSessionId(): Promise<string> {
    const key = sessionHashKey(this.hostId);
    const existing = await this.redis.hget(key, "sid");
    if (existing !== null && existing.length > 0) {
      const sid = existing.trim();
      const now = new Date().toISOString();
      await this.redis.hset(key, "updatedAt", now);
      agentPlayVerbose("redis-session", "loadOrCreateSessionId reuse", {
        hostId: this.hostId,
        key,
        sidPrefix: `${sid.slice(0, 8)}…`,
      });
      this.cachedSid = sid;
      return sid;
    }
    const newSid = randomUUID();
    const created = await this.redis.hsetnx(key, "sid", newSid);
    if (created === 1) {
      const now = new Date().toISOString();
      const pipe = this.redis.multi();
      pipe.hset(key, "createdAt", now);
      pipe.hset(key, "updatedAt", now);
      if (this.previewBaseUrl !== undefined && this.previewBaseUrl.length > 0) {
        pipe.hset(key, "previewBaseUrl", this.previewBaseUrl);
      }
      await pipe.exec();
      agentPlayVerbose("redis-session", "loadOrCreateSessionId new", {
        hostId: this.hostId,
        key,
        sidPrefix: `${newSid.slice(0, 8)}…`,
      });
      this.cachedSid = newSid;
      return newSid;
    }
    const winner = await this.redis.hget(key, "sid");
    if (winner !== null && winner.length > 0) {
      const w = winner.trim();
      agentPlayVerbose("redis-session", "loadOrCreateSessionId race lost", {
        hostId: this.hostId,
        sidPrefix: `${w.slice(0, 8)}…`,
      });
      this.cachedSid = w;
      return w;
    }
    throw new Error("redis session: failed to allocate sid");
  }

  async isValidSession(sid: string): Promise<boolean> {
    if (sid.length === 0) return false;
    const key = sessionHashKey(this.hostId);
    const canonical = await this.redis.hget(key, "sid");
    const c = canonical !== null ? canonical.trim() : null;
    const ok = c !== null && c.length > 0 && c === sid;
    agentPlayVerbose("redis-session", "isValidSession", {
      hostId: this.hostId,
      key,
      canonicalPrefix: c ? `${c.slice(0, 8)}…` : null,
      sidPrefix: `${sid.slice(0, 8)}…`,
      ok,
    });
    return ok;
  }

  async replaceSessionWithNewSid(newSid: string): Promise<void> {
    const sh = sessionHashKey(this.hostId);
    await this.redis.del(snapshotKey(this.hostId));
    await this.redis.del(gridOccupiedKey(this.hostId));
    await this.redis.del(eventLogKey(this.hostId));
    await this.redis.del(worldChatKey(this.hostId));
    await this.redis.del(settingsHashKey(this.hostId));
    await this.redis.del(playerChainLeavesKey(this.hostId));
    await this.redis.del(sh);
    const now = new Date().toISOString();
    const fields: Record<string, string> = {
      sid: newSid,
      createdAt: now,
      updatedAt: now,
    };
    if (this.previewBaseUrl !== undefined && this.previewBaseUrl.length > 0) {
      fields.previewBaseUrl = this.previewBaseUrl;
    }
    await this.redis.hset(sh, fields);
    this.cachedSid = newSid;
  }

  async clearWorldSnapshot(): Promise<void> {
    const sessKey = sessionHashKey(this.hostId);
    const chain = this.redis.multi();
    chain.del(snapshotKey(this.hostId));
    chain.del(gridOccupiedKey(this.hostId));
    chain.del(playerChainLeavesKey(this.hostId));
    chain.hdel(
      sessKey,
      "lastSnapshotAt",
      "snapshotBytes",
      "snapshotRev",
      "worldChatSeq",
      "merkleRootHex",
      "merkleLeafCount"
    );
    await chain.exec();
  }

  async appendWorldChatMessage(input: {
    requestId: string;
    mainNodeId: string;
    fromPlayerId: string;
    message: string;
    ts: string;
  }): Promise<{ message: WorldChatMessage; totalCount: number }> {
    const seq = await this.redis.hincrby(
      sessionHashKey(this.hostId),
      "worldChatSeq",
      1
    );
    const message: WorldChatMessage = {
      seq,
      requestId: input.requestId,
      mainNodeId: input.mainNodeId,
      fromPlayerId: input.fromPlayerId,
      message: input.message,
      ts: input.ts,
    };
    const key = worldChatKey(this.hostId);
    const pipe = this.redis.multi();
    pipe.lpush(key, JSON.stringify(message));
    pipe.ltrim(key, 0, WORLD_CHAT_MAX - 1);
    pipe.hset(sessionHashKey(this.hostId), "lastEventAt", input.ts);
    pipe.llen(key);
    const result = await pipe.exec();
    const totalCountRaw = result?.[3]?.[1];
    const totalCount =
      typeof totalCountRaw === "number" ? totalCountRaw : await this.redis.llen(key);
    return { message, totalCount };
  }

  async listWorldChatMessages(input: {
    limit: number;
    beforeSeq?: number;
  }): Promise<{ messages: WorldChatMessage[]; hasMore: boolean; totalCount: number }> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(input.limit)));
    const key = worldChatKey(this.hostId);
    const totalCount = await this.redis.llen(key);
    const rows = await this.redis.lrange(key, 0, WORLD_CHAT_MAX - 1);
    const parsed: WorldChatMessage[] = [];
    for (const row of rows) {
      try {
        const value = JSON.parse(row) as WorldChatMessage;
        if (
          typeof value.seq === "number" &&
          typeof value.requestId === "string" &&
          typeof value.mainNodeId === "string" &&
          typeof value.fromPlayerId === "string" &&
          typeof value.message === "string" &&
          typeof value.ts === "string"
        ) {
          parsed.push(value);
        }
      } catch {
        continue;
      }
    }
    const beforeSeq =
      typeof input.beforeSeq === "number" ? input.beforeSeq : undefined;
    const filtered =
      beforeSeq !== undefined
        ? parsed.filter((message) => message.seq < beforeSeq)
        : parsed;
    const messages = filtered.slice(0, safeLimit);
    return {
      messages,
      hasMore: filtered.length > safeLimit,
      totalCount,
    };
  }

  async persistSnapshot(snapshot: PreviewSnapshotJson): Promise<void> {
    const raw = JSON.stringify(snapshot);
    const sessKey = sessionHashKey(this.hostId);
    const { merkleRootHex, merkleLeafCount } = buildPlayerChainFromSnapshot(
      snapshot,
      this.playerChainGenesis
    );
    const chain = this.redis.multi();
    this.appendSnapshotAndGridToMulti(chain, snapshot, raw);
    this.appendPlayerChainLeavesToMulti(chain, snapshot);
    chain.hset(sessKey, {
      lastSnapshotAt: new Date().toISOString(),
      snapshotBytes: String(Buffer.byteLength(raw, "utf8")),
      merkleRootHex,
      merkleLeafCount: String(merkleLeafCount),
    });
    await chain.exec();
  }

  async persistSnapshotReturningRev(
    snapshot: PreviewSnapshotJson
  ): Promise<PersistSnapshotRev> {
    const raw = JSON.stringify(snapshot);
    const { merkleRootHex, merkleLeafCount } = buildPlayerChainFromSnapshot(
      snapshot,
      this.playerChainGenesis
    );
    const sess = sessionHashKey(this.hostId);
    const chain = this.redis.multi();
    this.appendSnapshotAndGridToMulti(chain, snapshot, raw);
    this.appendPlayerChainLeavesToMulti(chain, snapshot);
    chain.hincrby(sess, "snapshotRev", 1);
    chain.hset(sess, {
      lastSnapshotAt: new Date().toISOString(),
      snapshotBytes: String(Buffer.byteLength(raw, "utf8")),
      merkleRootHex,
      merkleLeafCount: String(merkleLeafCount),
    });
    const results = await chain.exec();
    if (results === null) {
      throw new Error("redis persistSnapshot: transaction aborted");
    }
    const rev = await this.getSnapshotRev();
    return { rev, merkleRootHex, merkleLeafCount };
  }

  async getSnapshotRev(): Promise<number> {
    const v = await this.redis.hget(sessionHashKey(this.hostId), "snapshotRev");
    if (v === null || v.length === 0) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async publishWorldFanout(
    rev: number,
    event: string,
    data: unknown,
    options?: WorldFanoutOptions
  ): Promise<void> {
    const channel = worldFanoutChannel(this.hostId);
    const envelope: Record<string, unknown> = { rev, event, data };
    if (
      options?.merkleRootHex !== undefined &&
      options.merkleRootHex.length > 0
    ) {
      envelope.merkleRootHex = options.merkleRootHex;
    }
    if (
      options?.merkleLeafCount !== undefined &&
      Number.isFinite(options.merkleLeafCount)
    ) {
      envelope.merkleLeafCount = options.merkleLeafCount;
    }
    if (options?.playerChainNotify !== undefined) {
      envelope.playerChainNotify = options.playerChainNotify;
    }
    const msg = JSON.stringify(envelope);
    await this.redis.publish(channel, msg);
  }

  async appendEventLog(entry: SessionEventLogEntry): Promise<void> {
    const line = JSON.stringify({
      type: entry.type,
      at: entry.at,
      summary: entry.summary.slice(0, 4_000),
    });
    const key = eventLogKey(this.hostId);
    const pipe = this.redis.multi();
    pipe.lpush(key, line);
    pipe.ltrim(key, 0, EVENT_LOG_MAX - 1);
    await pipe.exec();
    await this.redis.hset(
      sessionHashKey(this.hostId),
      "lastEventAt",
      entry.at
    );
  }

  async mergeSettings(partial: Record<string, string>): Promise<void> {
    if (Object.keys(partial).length === 0) return;
    await this.redis.hset(settingsHashKey(this.hostId), partial);
  }

  async getPublishedMetadata(): Promise<PublishedSessionMetadata> {
    const meta = await this.redis.hgetall(sessionHashKey(this.hostId));
    const settings = await this.redis.hgetall(settingsHashKey(this.hostId));
    const eventLen = await this.redis.llen(eventLogKey(this.hostId));
    const leafRaw = meta.merkleLeafCount;
    const leafN =
      leafRaw !== undefined && leafRaw.length > 0 ? Number(leafRaw) : NaN;
    return {
      sid: meta.sid ?? null,
      createdAt: meta.createdAt ?? null,
      updatedAt: meta.updatedAt ?? null,
      lastSnapshotAt: meta.lastSnapshotAt ?? null,
      lastEventAt: meta.lastEventAt ?? null,
      snapshotBytes: meta.snapshotBytes ?? null,
      eventLogLength: eventLen,
      settings,
      merkleRootHex: meta.merkleRootHex ?? null,
      merkleLeafCount: Number.isFinite(leafN) ? leafN : null,
    };
  }

  async getSnapshotJson(): Promise<PreviewSnapshotJson | null> {
    const raw = await this.redis.get(snapshotKey(this.hostId));
    if (raw === null || raw.length === 0) return null;
    try {
      return JSON.parse(raw) as PreviewSnapshotJson;
    } catch {
      return null;
    }
  }

  async getRecentEventLog(limit: number): Promise<SessionEventLogEntry[]> {
    const n = Math.min(Math.max(limit, 1), EVENT_LOG_MAX);
    const lines = await this.redis.lrange(
      eventLogKey(this.hostId),
      0,
      n - 1
    );
    const out: SessionEventLogEntry[] = [];
    for (const line of lines) {
      try {
        const p = JSON.parse(line) as unknown;
        if (
          typeof p === "object" &&
          p !== null &&
          "type" in p &&
          "at" in p &&
          "summary" in p
        ) {
          const o = p as SessionEventLogEntry;
          out.push({
            type: o.type,
            at: o.at,
            summary: o.summary,
          });
        }
      } catch {
        continue;
      }
    }
    return out;
  }

  async upsertPresenceLease(input: {
    playerId: string;
    agentId: string;
    sid: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    const key = presenceLeaseKey(this.hostId, input.playerId);
    const ttlSeconds = Math.max(1, Math.floor(input.ttlSeconds));
    await this.redis.set(
      key,
      JSON.stringify({
        playerId: input.playerId,
        agentId: input.agentId,
        sid: input.sid,
        connectionId: input.connectionId,
        lastSeenAt: now,
      }),
      "EX",
      ttlSeconds
    );
  }

  async touchPresenceLease(input: {
    playerId: string;
    connectionId: string;
    ttlSeconds: number;
  }): Promise<boolean> {
    const key = presenceLeaseKey(this.hostId, input.playerId);
    const raw = await this.redis.get(key);
    if (raw === null || raw.length === 0) {
      return false;
    }
    let parsed: {
      playerId?: unknown;
      agentId?: unknown;
      sid?: unknown;
      connectionId?: unknown;
      lastSeenAt?: unknown;
    };
    try {
      parsed = JSON.parse(raw) as {
        playerId?: unknown;
        agentId?: unknown;
        sid?: unknown;
        connectionId?: unknown;
        lastSeenAt?: unknown;
      };
    } catch {
      await this.redis.del(key);
      return false;
    }
    if (typeof parsed.connectionId !== "string") {
      await this.redis.del(key);
      return false;
    }
    if (parsed.connectionId !== input.connectionId) {
      return false;
    }
    const ttlSeconds = Math.max(1, Math.floor(input.ttlSeconds));
    await this.redis.set(
      key,
      JSON.stringify({
        playerId:
          typeof parsed.playerId === "string" ? parsed.playerId : input.playerId,
        agentId: typeof parsed.agentId === "string" ? parsed.agentId : "",
        sid: typeof parsed.sid === "string" ? parsed.sid : this.getSessionId(),
        connectionId: parsed.connectionId,
        lastSeenAt: new Date().toISOString(),
      }),
      "EX",
      ttlSeconds
    );
    return true;
  }

  async removePresenceLease(input: {
    playerId: string;
    connectionId?: string;
  }): Promise<void> {
    const key = presenceLeaseKey(this.hostId, input.playerId);
    if (input.connectionId === undefined || input.connectionId.length === 0) {
      await this.redis.del(key);
      return;
    }
    const raw = await this.redis.get(key);
    if (raw === null || raw.length === 0) return;
    try {
      const parsed = JSON.parse(raw) as { connectionId?: unknown };
      if (
        typeof parsed.connectionId === "string" &&
        parsed.connectionId === input.connectionId
      ) {
        await this.redis.del(key);
      }
    } catch {
      await this.redis.del(key);
    }
  }

  async hasPresenceLease(playerId: string): Promise<boolean> {
    const exists = await this.redis.exists(presenceLeaseKey(this.hostId, playerId));
    return exists === 1;
  }

  async listPresenceLeases(): Promise<PresenceLease[]> {
    const keys = await this.redis.keys(`agent-play:${this.hostId}:presence:*`);
    if (keys.length === 0) return [];
    const raws = await this.redis.mget(...keys);
    const out: PresenceLease[] = [];
    for (const raw of raws) {
      if (raw === null || raw.length === 0) continue;
      try {
        const parsed = JSON.parse(raw) as {
          playerId?: unknown;
          agentId?: unknown;
          sid?: unknown;
          connectionId?: unknown;
          lastSeenAt?: unknown;
        };
        if (
          typeof parsed.playerId === "string" &&
          typeof parsed.agentId === "string" &&
          typeof parsed.sid === "string" &&
          typeof parsed.connectionId === "string" &&
          typeof parsed.lastSeenAt === "string"
        ) {
          out.push({
            playerId: parsed.playerId,
            agentId: parsed.agentId,
            sid: parsed.sid,
            connectionId: parsed.connectionId,
            lastSeenAt: parsed.lastSeenAt,
          });
        }
      } catch {
        continue;
      }
    }
    return out;
  }

  async appendSpaceAmenityLog(input: {
    spaceId: string;
    amenityKind: string;
    entry: SpaceAmenityLogEntry;
  }): Promise<void> {
    const key = spaceAmenityLogKey(
      this.hostId,
      input.spaceId,
      input.amenityKind
    );
    const line = JSON.stringify(input.entry);
    await this.redis.lpush(key, line);
    await this.redis.ltrim(key, 0, SPACE_AMENITY_LOG_MAX - 1);
  }

  async listSpaceAmenityLogs(input: {
    spaceId: string;
    amenityKind?: string;
    limit: number;
  }): Promise<SpaceAmenityLogEntry[]> {
    const lim = Math.min(Math.max(input.limit, 1), SPACE_AMENITY_LOG_MAX);
    if (input.amenityKind !== undefined) {
      const key = spaceAmenityLogKey(
        this.hostId,
        input.spaceId,
        input.amenityKind
      );
      const raw = await this.redis.lrange(key, 0, lim - 1);
      return raw
        .map((line) => {
          try {
            return JSON.parse(line) as SpaceAmenityLogEntry;
          } catch {
            return null;
          }
        })
        .filter((x): x is SpaceAmenityLogEntry => x !== null);
    }
    const merged: SpaceAmenityLogEntry[] = [];
    for (const kind of ["supermarket", "shop", "car_wash"]) {
      const key = spaceAmenityLogKey(this.hostId, input.spaceId, kind);
      const raw = await this.redis.lrange(key, 0, SPACE_AMENITY_LOG_MAX - 1);
      for (const line of raw) {
        try {
          merged.push(JSON.parse(line) as SpaceAmenityLogEntry);
        } catch {
          continue;
        }
      }
    }
    merged.sort((a, b) => b.at.localeCompare(a.at));
    return merged.slice(0, lim);
  }

  async upsertSpaceLease(record: SpaceLeaseRecord): Promise<void> {
    const key = spaceLeasesHashKey(this.hostId, record.spaceId);
    await this.redis.hset(key, record.leaseId, JSON.stringify(record));
  }

  async listSpaceLeases(spaceId: string): Promise<SpaceLeaseRecord[]> {
    const key = spaceLeasesHashKey(this.hostId, spaceId);
    const raw = await this.redis.hgetall(key);
    const out: SpaceLeaseRecord[] = [];
    for (const value of Object.values(raw)) {
      try {
        out.push(JSON.parse(value) as SpaceLeaseRecord);
      } catch {
        continue;
      }
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async deleteSpaceLease(input: {
    spaceId: string;
    leaseId: string;
  }): Promise<boolean> {
    const key = spaceLeasesHashKey(this.hostId, input.spaceId);
    const removed = await this.redis.hdel(key, input.leaseId);
    return removed === 1;
  }

  async deleteSpaceSidecar(spaceId: string): Promise<void> {
    await this.redis.del(spaceLeasesHashKey(this.hostId, spaceId));
    for (const kind of ["supermarket", "shop", "car_wash"] as const) {
      await this.redis.del(spaceAmenityLogKey(this.hostId, spaceId, kind));
    }
    await this.redis.del(spaceShopItemsHashKey(this.hostId, spaceId));
    await this.redis.del(spaceSupermarketItemsHashKey(this.hostId, spaceId));
    await this.redis.del(spaceCarWashCarsHashKey(this.hostId, spaceId));
  }

  async upsertShopItem(item: ShopItem): Promise<void> {
    const key = spaceShopItemsHashKey(this.hostId, item.spaceId);
    await this.redis.hset(key, item.id, JSON.stringify(item));
  }

  async listShopItems(spaceId: string): Promise<ShopItem[]> {
    const key = spaceShopItemsHashKey(this.hostId, spaceId);
    const raw = await this.redis.hgetall(key);
    const out: ShopItem[] = [];
    for (const value of Object.values(raw)) {
      try {
        out.push(ShopItemSchema.parse(JSON.parse(value)));
      } catch {
        continue;
      }
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async removeShopItem(input: {
    spaceId: string;
    itemId: string;
  }): Promise<boolean> {
    const key = spaceShopItemsHashKey(this.hostId, input.spaceId);
    const removed = await this.redis.hdel(key, input.itemId);
    return removed === 1;
  }

  async upsertSupermarketItem(item: SupermarketItem): Promise<void> {
    const key = spaceSupermarketItemsHashKey(this.hostId, item.spaceId);
    await this.redis.hset(key, item.id, JSON.stringify(item));
  }

  async listSupermarketItems(spaceId: string): Promise<SupermarketItem[]> {
    const key = spaceSupermarketItemsHashKey(this.hostId, spaceId);
    const raw = await this.redis.hgetall(key);
    const out: SupermarketItem[] = [];
    for (const value of Object.values(raw)) {
      try {
        out.push(SupermarketItemSchema.parse(JSON.parse(value)));
      } catch {
        continue;
      }
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async removeSupermarketItem(input: {
    spaceId: string;
    itemId: string;
  }): Promise<boolean> {
    const key = spaceSupermarketItemsHashKey(this.hostId, input.spaceId);
    const removed = await this.redis.hdel(key, input.itemId);
    return removed === 1;
  }

  async upsertCarWashCar(car: CarWashCar): Promise<void> {
    const key = spaceCarWashCarsHashKey(this.hostId, car.spaceId);
    await this.redis.hset(key, car.id, JSON.stringify(car));
  }

  async listCarWashCars(spaceId: string): Promise<CarWashCar[]> {
    const key = spaceCarWashCarsHashKey(this.hostId, spaceId);
    const raw = await this.redis.hgetall(key);
    const out: CarWashCar[] = [];
    for (const value of Object.values(raw)) {
      try {
        out.push(CarWashCarSchema.parse(JSON.parse(value)));
      } catch {
        continue;
      }
    }
    return out.sort((a, b) => a.slot - b.slot);
  }

  async removeCarWashCar(input: {
    spaceId: string;
    carId: string;
  }): Promise<boolean> {
    const key = spaceCarWashCarsHashKey(this.hostId, input.spaceId);
    const removed = await this.redis.hdel(key, input.carId);
    return removed === 1;
  }

  /**
   * Lazy wallet seed on first read.
   *
   * @remarks
   * Uses `WATCH`/`MULTI` so two concurrent first-reads cannot both write a new
   * wallet; the losing transaction re-reads the freshly written value.
   */
  async getPlayerWallet(playerId: string): Promise<PlayerWallet> {
    const key = playerWalletKey(this.hostId, playerId);
    const raw = await this.redis.get(key);
    if (raw !== null && raw.length > 0) {
      try {
        return PlayerWalletSchema.parse(JSON.parse(raw));
      } catch {
        // fall through to seed below
      }
    }
    const seeded = createInitialPlayerWallet({
      playerId,
      now: new Date().toISOString(),
    });
    // Atomic seed: WATCH the key, only write if still empty.
    await this.redis.watch(key);
    const stillRaw = await this.redis.get(key);
    if (stillRaw !== null && stillRaw.length > 0) {
      await this.redis.unwatch();
      try {
        return PlayerWalletSchema.parse(JSON.parse(stillRaw));
      } catch {
        // best-effort: overwrite malformed value via SET below.
      }
    }
    const multi = this.redis.multi();
    multi.set(key, JSON.stringify(seeded));
    const exec = await multi.exec();
    if (exec === null) {
      // Lost the race; re-read what the winner wrote.
      const winnerRaw = await this.redis.get(key);
      if (winnerRaw !== null && winnerRaw.length > 0) {
        try {
          return PlayerWalletSchema.parse(JSON.parse(winnerRaw));
        } catch {
          // fall through and return our seed value; the winner wrote $70 too.
        }
      }
    }
    return seeded;
  }

  async getOrCreateAgentWalletForTalkRewards(
    playerId: string
  ): Promise<PlayerWallet> {
    const key = playerWalletKey(this.hostId, playerId);
    const raw = await this.redis.get(key);
    if (raw !== null && raw.length > 0) {
      try {
        return PlayerWalletSchema.parse(JSON.parse(raw));
      } catch {
        // fall through to seed
      }
    }
    const seeded = createInitialAgentRewardWallet({
      playerId,
      now: new Date().toISOString(),
    });
    await this.redis.watch(key);
    const stillRaw = await this.redis.get(key);
    if (stillRaw !== null && stillRaw.length > 0) {
      await this.redis.unwatch();
      try {
        return PlayerWalletSchema.parse(JSON.parse(stillRaw));
      } catch {
        // best-effort: overwrite malformed value via SET below.
      }
    }
    const multi = this.redis.multi();
    multi.set(key, JSON.stringify(seeded));
    const exec = await multi.exec();
    if (exec === null) {
      const winnerRaw = await this.redis.get(key);
      if (winnerRaw !== null && winnerRaw.length > 0) {
        try {
          return PlayerWalletSchema.parse(JSON.parse(winnerRaw));
        } catch {
          // fall through
        }
      }
    }
    return seeded;
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
    const current = await this.getPlayerWallet(input.playerId);
    const wallet: PlayerWallet = {
      ...current,
      balanceUsd: input.balanceUsd,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(
      playerWalletKey(this.hostId, input.playerId),
      JSON.stringify(wallet)
    );
    return wallet;
  }

  /**
   * Atomic increment/decrement of the wallet balance via WATCH/MULTI.
   *
   * @throws when the resulting balance would be negative.
   */
  async adjustPlayerWalletBalance(input: {
    playerId: string;
    deltaUsd: number;
  }): Promise<PlayerWallet> {
    const key = playerWalletKey(this.hostId, input.playerId);
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const current = await this.getPlayerWallet(input.playerId);
      await this.redis.watch(key);
      const nextBalance = current.balanceUsd + input.deltaUsd;
      if (nextBalance < 0 || !Number.isFinite(nextBalance)) {
        await this.redis.unwatch();
        throw new Error(
          `adjustPlayerWalletBalance: insufficient funds for player ${input.playerId}`
        );
      }
      const next: PlayerWallet = {
        ...current,
        balanceUsd: nextBalance,
        updatedAt: new Date().toISOString(),
      };
      const multi = this.redis.multi();
      multi.set(key, JSON.stringify(next));
      const exec = await multi.exec();
      if (exec !== null) {
        return next;
      }
    }
    throw new Error(
      `adjustPlayerWalletBalance: lost ${String(maxAttempts)} CAS retries for player ${input.playerId}`
    );
  }

  async appendPurchaseRecord(record: PurchaseRecord): Promise<void> {
    const key = playerPurchasesKey(this.hostId, record.playerId);
    await this.redis.lpush(key, JSON.stringify(record));
    await this.redis.ltrim(key, 0, PURCHASES_MAX - 1);
  }

  async listPurchases(input: {
    playerId: string;
    limit: number;
  }): Promise<PurchaseRecord[]> {
    const key = playerPurchasesKey(this.hostId, input.playerId);
    const lim = Math.min(Math.max(input.limit, 1), PURCHASES_MAX);
    const raw = await this.redis.lrange(key, 0, lim - 1);
    const out: PurchaseRecord[] = [];
    for (const line of raw) {
      try {
        out.push(PurchaseRecordSchema.parse(JSON.parse(line)));
      } catch {
        continue;
      }
    }
    return out;
  }

  /**
   * Atomic purchase: WATCH the item-bucket hash and the wallet key, re-read
   * both, and apply the sold flag + balance debit in a single MULTI.
   *
   * @remarks
   * Concurrent buyers both reach the WATCH but only one EXEC succeeds; the
   * losing call returns `ITEM_ALREADY_SOLD` on retry.
   */
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
    const itemKey =
      input.itemRef.kind === "shop"
        ? spaceShopItemsHashKey(this.hostId, input.spaceId)
        : input.itemRef.kind === "supermarket"
          ? spaceSupermarketItemsHashKey(this.hostId, input.spaceId)
          : spaceCarWashCarsHashKey(this.hostId, input.spaceId);
    const walletKey = playerWalletKey(this.hostId, input.playerId);
    const purchasesKeyName = playerPurchasesKey(this.hostId, input.playerId);

    await this.getPlayerWallet(input.playerId);

    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.redis.watch(itemKey, walletKey);
      const rawItem = await this.redis.hget(itemKey, input.itemRef.id);
      if (rawItem === null) {
        await this.redis.unwatch();
        return { ok: false, error: "ITEM_NOT_FOUND" };
      }
      let item: ShopItem | SupermarketItem | CarWashCar;
      try {
        const parsed = JSON.parse(rawItem) as unknown;
        if (input.itemRef.kind === "shop") {
          item = ShopItemSchema.parse(parsed);
        } else if (input.itemRef.kind === "supermarket") {
          item = SupermarketItemSchema.parse(parsed);
        } else {
          item = CarWashCarSchema.parse(parsed);
        }
      } catch {
        await this.redis.unwatch();
        return { ok: false, error: "ITEM_NOT_FOUND" };
      }
      if (item.sale.status !== "available") {
        await this.redis.unwatch();
        return { ok: false, error: "ITEM_ALREADY_SOLD" };
      }
      const rawWallet = await this.redis.get(walletKey);
      if (rawWallet === null) {
        await this.redis.unwatch();
        return { ok: false, error: "INSUFFICIENT_FUNDS" };
      }
      let wallet: PlayerWallet;
      try {
        wallet = PlayerWalletSchema.parse(JSON.parse(rawWallet));
      } catch {
        await this.redis.unwatch();
        return { ok: false, error: "INSUFFICIENT_FUNDS" };
      }
      if (wallet.balanceUsd < item.priceUsd) {
        await this.redis.unwatch();
        return { ok: false, error: "INSUFFICIENT_FUNDS" };
      }
      const updatedItem = {
        ...item,
        sale: {
          status: "sold" as const,
          soldToPlayerId: input.playerId,
          soldAt: input.now,
        },
      };
      const earnedPowerUps = Math.floor(item.priceUsd) * 3;
      const updatedWallet: PlayerWallet = {
        ...wallet,
        balanceUsd: wallet.balanceUsd - item.priceUsd,
        powerUps: (wallet.powerUps ?? 0) + earnedPowerUps,
        updatedAt: input.now,
      };
      const record: PurchaseRecord = {
        id: input.recordId,
        playerId: input.playerId,
        spaceId: input.spaceId,
        amenityKind: input.amenityKind,
        itemRef: input.itemRef,
        priceUsd: item.priceUsd,
        at: input.now,
      };
      const multi = this.redis.multi();
      multi.hset(itemKey, input.itemRef.id, JSON.stringify(updatedItem));
      multi.set(walletKey, JSON.stringify(updatedWallet));
      multi.lpush(purchasesKeyName, JSON.stringify(record));
      multi.ltrim(purchasesKeyName, 0, PURCHASES_MAX - 1);
      const exec = await multi.exec();
      if (exec !== null) {
        return {
          ok: true,
          record,
          wallet: updatedWallet,
          updatedItem,
        };
      }
    }
    return { ok: false, error: "ITEM_ALREADY_SOLD" };
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
    const key = playerWalletKey(this.hostId, input.playerId);
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const current = await this.getPlayerWallet(input.playerId);
      await this.redis.watch(key);
      const rawWallet = await this.redis.get(key);
      let wallet: PlayerWallet;
      try {
        wallet =
          rawWallet !== null && rawWallet.length > 0
            ? PlayerWalletSchema.parse(JSON.parse(rawWallet))
            : current;
      } catch {
        await this.redis.unwatch();
        continue;
      }
      const next: PlayerWallet = {
        ...wallet,
        powerUps: (wallet.powerUps ?? 0) + input.amount,
        updatedAt: input.now,
      };
      const multi = this.redis.multi();
      multi.set(key, JSON.stringify(next));
      const exec = await multi.exec();
      if (exec !== null) {
        return next;
      }
    }
    throw new Error(
      `addPowerUps: lost ${String(maxAttempts)} CAS retries for player ${input.playerId}`
    );
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
    await this.getPlayerWallet(input.playerId);
    const walletKey = playerWalletKey(this.hostId, input.playerId);
    const purchasesKeyName = playerPurchasesKey(this.hostId, input.playerId);
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.redis.watch(walletKey);
      const rawWallet = await this.redis.get(walletKey);
      if (rawWallet === null || rawWallet.length === 0) {
        await this.redis.unwatch();
        return { ok: false, error: "INSUFFICIENT_POWER_UPS" };
      }
      let wallet: PlayerWallet;
      try {
        wallet = PlayerWalletSchema.parse(JSON.parse(rawWallet));
      } catch {
        await this.redis.unwatch();
        return { ok: false, error: "INSUFFICIENT_POWER_UPS" };
      }
      const pu = wallet.powerUps ?? 0;
      if (pu < bundle.powerUpsCost) {
        await this.redis.unwatch();
        return { ok: false, error: "INSUFFICIENT_POWER_UPS" };
      }
      const nextBalance = wallet.balanceUsd + bundle.creditUsd;
      if (!Number.isFinite(nextBalance) || nextBalance < 0) {
        await this.redis.unwatch();
        return { ok: false, error: "INVALID_BUNDLE" };
      }
      const updatedWallet: PlayerWallet = {
        ...wallet,
        balanceUsd: nextBalance,
        powerUps: pu - bundle.powerUpsCost,
        updatedAt: input.now,
      };
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
      const multi = this.redis.multi();
      multi.set(walletKey, JSON.stringify(updatedWallet));
      multi.lpush(purchasesKeyName, JSON.stringify(record));
      multi.ltrim(purchasesKeyName, 0, PURCHASES_MAX - 1);
      const exec = await multi.exec();
      if (exec !== null) {
        return { ok: true, wallet: updatedWallet, record };
      }
    }
    throw new Error(
      `redeemWalletBundle: lost ${String(maxAttempts)} CAS retries for player ${input.playerId}`
    );
  }

  private async loadGamePlayerState(
    playerId: string,
    now: Date
  ): Promise<import("./game-outcome-store.js").GamePlayerState> {
    const key = playerGameStateKey(this.hostId, playerId);
    const raw = await this.redis.get(key);
    if (raw === null || raw.length === 0) {
      return createInitialGamePlayerState(now);
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) {
        return createInitialGamePlayerState(now);
      }
      return deserializeGamePlayerState(
        parsed as import("./game-outcome-store.js").SerializedGamePlayerState
      );
    } catch {
      return createInitialGamePlayerState(now);
    }
  }

  async getGameStats(input: {
    playerId: string;
    now: string;
  }): Promise<import("@agent-play/sdk").GameStats> {
    const now = new Date(input.now);
    const state = await this.loadGamePlayerState(input.playerId, now);
    return getGameStatsFromState({ state, now });
  }

  async applyGameOutcome(input: {
    playerId: string;
    outcome: import("@agent-play/sdk").ApplyGameOutcomeInput;
    now: string;
  }): Promise<
    | {
        ok: true;
        stats: import("@agent-play/sdk").GameStats;
        wallet: PlayerWallet;
        netPu: number;
      }
    | {
        ok: false;
        error: "DUPLICATE_ROUND" | "INVALID_EVENTS" | "CAP_EXCEEDED";
      }
  > {
    const parsed = ApplyGameOutcomeInputSchema.safeParse(input.outcome);
    if (!parsed.success) {
      return { ok: false, error: "INVALID_EVENTS" };
    }
    const now = new Date(input.now);
    const stateKey = playerGameStateKey(this.hostId, input.playerId);
    const walletKey = playerWalletKey(this.hostId, input.playerId);
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.redis.watch(stateKey, walletKey);
      const state = await this.loadGamePlayerState(input.playerId, now);
      const wallet = await this.getPlayerWallet(input.playerId);
      const applied = applyGameOutcomeToState({
        state,
        wallet,
        outcome: parsed.data,
        now,
      });
      if (!applied.result.ok) {
        await this.redis.unwatch();
        return applied.result;
      }
      const multi = this.redis.multi();
      multi.set(stateKey, JSON.stringify(serializeGamePlayerState(applied.state)));
      multi.set(walletKey, JSON.stringify(applied.wallet));
      const exec = await multi.exec();
      if (exec !== null) {
        return applied.result;
      }
    }
    throw new Error(
      `applyGameOutcome: lost ${String(maxAttempts)} CAS retries for player ${input.playerId}`
    );
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
    const wallet = await this.getPlayerWallet(input.viewerNodeId);
    if (wallet.balanceUsd <= 0) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }
    const key = talkSessionKey(
      this.hostId,
      input.viewerNodeId,
      input.agentId
    );
    const initial: TalkSessionStored = {
      startedAtIso: input.now,
      lastBilledAtIso: input.now,
      totalBilledSeconds: 0,
      totalChargedUsd: 0,
    };
    const setResult = await this.redis.set(
      key,
      JSON.stringify(initial),
      "NX"
    );
    if (setResult === null) {
      return { ok: false, error: "ALREADY_ACTIVE" };
    }
    return {
      ok: true,
      startedAt: input.now,
      ratePerSecondUsd: TALK_PRICE_PER_SECOND_USD,
      wallet,
    };
  }

  private async appendTalkTimePurchaseRecord(input: {
    playerId: string;
    agentId: string;
    priceUsd: number;
    billedSeconds: number;
    at: string;
  }): Promise<void> {
    const record: PurchaseRecord = PurchaseRecordSchema.parse({
      id: `talk-${randomUUID()}`,
      playerId: input.playerId,
      spaceId: "__talk__",
      amenityKind: "talk_time",
      itemRef: { kind: "shop", id: "openai-realtime" },
      priceUsd: input.priceUsd,
      at: input.at,
      detail: `Realtime voice · ${String(input.billedSeconds)}s · agent ${input.agentId}`,
    });
    await this.appendPurchaseRecord(record);
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
    const talkKey = talkSessionKey(
      this.hostId,
      input.viewerNodeId,
      input.agentId
    );
    const walletKey = playerWalletKey(this.hostId, input.viewerNodeId);
    const agentWalletKey = playerWalletKey(this.hostId, input.agentId);
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.redis.watch(talkKey, walletKey, agentWalletKey);
      const rawTalk = await this.redis.get(talkKey);
      const session =
        rawTalk !== null && rawTalk.length > 0
          ? parseTalkSessionStored(rawTalk)
          : null;
      if (session === null) {
        await this.redis.unwatch();
        return { ok: false, error: "NO_SESSION" };
      }
      const rawWallet = await this.redis.get(walletKey);
      if (rawWallet === null || rawWallet.length === 0) {
        await this.redis.unwatch();
        const multiDel = this.redis.multi();
        multiDel.del(talkKey);
        await multiDel.exec();
        return { ok: false, error: "INSUFFICIENT_FUNDS" };
      }
      let wallet: PlayerWallet;
      try {
        wallet = PlayerWalletSchema.parse(JSON.parse(rawWallet));
      } catch {
        await this.redis.unwatch();
        const multiDel = this.redis.multi();
        multiDel.del(talkKey);
        await multiDel.exec();
        return { ok: false, error: "INSUFFICIENT_FUNDS" };
      }
      const rawAgentWallet = await this.redis.get(agentWalletKey);
      let agentWallet: PlayerWallet;
      if (rawAgentWallet === null || rawAgentWallet.length === 0) {
        agentWallet = createInitialAgentRewardWallet({
          playerId: input.agentId,
          now: input.now,
        });
      } else {
        try {
          agentWallet = PlayerWalletSchema.parse(JSON.parse(rawAgentWallet));
        } catch {
          agentWallet = createInitialAgentRewardWallet({
            playerId: input.agentId,
            now: input.now,
          });
        }
      }
      const elapsedMs =
        Date.parse(input.now) - Date.parse(session.lastBilledAtIso);
      const billSeconds =
        elapsedMs > 0 ? Math.ceil(elapsedMs / 1000) : 0;
      const costUsd = costForSeconds(billSeconds);
      if (costUsd > wallet.balanceUsd) {
        await this.redis.unwatch();
        await this.redis.del(talkKey);
        return { ok: false, error: "INSUFFICIENT_FUNDS" };
      }
      const nextBalance = wallet.balanceUsd - costUsd;
      const nextWallet: PlayerWallet = {
        ...wallet,
        balanceUsd: nextBalance,
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
      const nextSession: TalkSessionStored = {
        ...session,
        lastBilledAtIso: input.now,
        totalBilledSeconds: session.totalBilledSeconds + billSeconds,
        totalChargedUsd: session.totalChargedUsd + costUsd,
      };
      const multi = this.redis.multi();
      multi.set(walletKey, JSON.stringify(nextWallet));
      multi.set(agentWalletKey, JSON.stringify(nextAgentWallet));
      multi.set(talkKey, JSON.stringify(nextSession));
      const exec = await multi.exec();
      if (exec !== null) {
        if (costUsd > 0) {
          await this.appendTalkTimePurchaseRecord({
            playerId: input.viewerNodeId,
            agentId: input.agentId,
            priceUsd: costUsd,
            billedSeconds: billSeconds,
            at: input.now,
          });
        }
        return {
          ok: true,
          secondsBilledThisTick: billSeconds,
          secondsBilledTotal: nextSession.totalBilledSeconds,
          costUsd,
          wallet: nextWallet,
        };
      }
    }
    throw new Error(
      `tickTalkSession: lost ${String(maxAttempts)} CAS retries for talk ${input.viewerNodeId}:${input.agentId}`
    );
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
    const talkKey = talkSessionKey(
      this.hostId,
      input.viewerNodeId,
      input.agentId
    );
    const walletKey = playerWalletKey(this.hostId, input.viewerNodeId);
    const agentWalletKey = playerWalletKey(this.hostId, input.agentId);
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.redis.watch(talkKey, walletKey, agentWalletKey);
      const rawTalk = await this.redis.get(talkKey);
      const session =
        rawTalk !== null && rawTalk.length > 0
          ? parseTalkSessionStored(rawTalk)
          : null;
      if (session === null) {
        await this.redis.unwatch();
        return { ok: false, error: "NO_SESSION" };
      }
      const rawWallet = await this.redis.get(walletKey);
      if (rawWallet === null || rawWallet.length === 0) {
        await this.redis.unwatch();
        await this.redis.del(talkKey);
        const w = await this.getPlayerWallet(input.viewerNodeId);
        return {
          ok: true,
          totalCostUsd: session.totalChargedUsd,
          secondsBilledTotal: session.totalBilledSeconds,
          wallet: w,
        };
      }
      let wallet: PlayerWallet;
      try {
        wallet = PlayerWalletSchema.parse(JSON.parse(rawWallet));
      } catch {
        await this.redis.unwatch();
        await this.redis.del(talkKey);
        const w = await this.getPlayerWallet(input.viewerNodeId);
        return {
          ok: true,
          totalCostUsd: session.totalChargedUsd,
          secondsBilledTotal: session.totalBilledSeconds,
          wallet: w,
        };
      }
      const rawAgentWallet = await this.redis.get(agentWalletKey);
      let agentWallet: PlayerWallet;
      if (rawAgentWallet === null || rawAgentWallet.length === 0) {
        agentWallet = createInitialAgentRewardWallet({
          playerId: input.agentId,
          now: input.now,
        });
      } else {
        try {
          agentWallet = PlayerWalletSchema.parse(JSON.parse(rawAgentWallet));
        } catch {
          agentWallet = createInitialAgentRewardWallet({
            playerId: input.agentId,
            now: input.now,
          });
        }
      }
      const elapsedMs =
        Date.parse(input.now) - Date.parse(session.lastBilledAtIso);
      const billSeconds =
        elapsedMs > 0 ? Math.ceil(elapsedMs / 1000) : 0;
      const finalCostUsd = costForSeconds(billSeconds);
      if (finalCostUsd > wallet.balanceUsd) {
        await this.redis.unwatch();
        await this.redis.del(talkKey);
        return {
          ok: true,
          totalCostUsd: session.totalChargedUsd,
          secondsBilledTotal: session.totalBilledSeconds,
          wallet,
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
      const totalCostUsd = session.totalChargedUsd + finalCostUsd;
      const secondsBilledTotal =
        session.totalBilledSeconds + billSeconds;
      const multi = this.redis.multi();
      multi.set(walletKey, JSON.stringify(nextWallet));
      multi.set(agentWalletKey, JSON.stringify(nextAgentWallet));
      multi.del(talkKey);
      const exec = await multi.exec();
      if (exec !== null) {
        if (finalCostUsd > 0) {
          await this.appendTalkTimePurchaseRecord({
            playerId: input.viewerNodeId,
            agentId: input.agentId,
            priceUsd: finalCostUsd,
            billedSeconds: billSeconds,
            at: input.now,
          });
        }
        return {
          ok: true,
          totalCostUsd,
          secondsBilledTotal,
          wallet: nextWallet,
        };
      }
    }
    throw new Error(
      `stopTalkSession: lost ${String(maxAttempts)} CAS retries for talk ${input.viewerNodeId}:${input.agentId}`
    );
  }

  async getGeographyHumans(): Promise<Map<string, GeographyHumanState>> {
    const sid = this.getSessionId();
    const key = geographyHumansKey(this.hostId, sid);
    const raw = await this.redis.hgetall(key);
    const out = new Map<string, GeographyHumanState>();
    for (const [fieldId, json] of Object.entries(raw)) {
      if (json.length === 0) continue;
      try {
        const parsed = JSON.parse(json) as Record<string, unknown>;
        out.set(fieldId, parseGeographyHumanState({ ...parsed, id: fieldId }));
      } catch {
        continue;
      }
    }
    return out;
  }

  async upsertGeographyHuman(state: GeographyHumanState): Promise<{
    prev: Map<string, GeographyHumanState>;
    next: Map<string, GeographyHumanState>;
  }> {
    const sid = this.getSessionId();
    const key = geographyHumansKey(this.hostId, sid);
    const prev = await this.getGeographyHumans();
    const next = new Map(prev);
    next.set(state.id, state);
    const pipe = this.redis.multi();
    pipe.hset(key, state.id, JSON.stringify(state));
    pipe.expire(key, GEOGRAPHY_REDIS_TTL_SECONDS);
    await pipe.exec();
    return { prev, next };
  }

  async removeGeographyHuman(humanId: string): Promise<{
    prev: Map<string, GeographyHumanState>;
    next: Map<string, GeographyHumanState>;
  }> {
    const sid = this.getSessionId();
    const key = geographyHumansKey(this.hostId, sid);
    const prev = await this.getGeographyHumans();
    const next = new Map(prev);
    next.delete(humanId);
    const pipe = this.redis.multi();
    pipe.hdel(key, humanId);
    if (next.size === 0) {
      pipe.del(key);
    } else {
      pipe.expire(key, GEOGRAPHY_REDIS_TTL_SECONDS);
    }
    await pipe.exec();
    return { prev, next };
  }

  getHostId(): string {
    return this.hostId;
  }

  getRedis(): Redis {
    return this.redis;
  }
}
