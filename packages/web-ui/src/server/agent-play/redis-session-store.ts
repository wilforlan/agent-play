import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { agentPlayVerbose } from "./agent-play-debug.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import { getPlayerChainGenesisSync } from "./load-player-chain-genesis.js";
import {
  buildLeafFieldMapFromSnapshot,
  buildPlayerChainFromSnapshot,
  playerChainLeavesKey,
} from "./player-chain/index.js";
import { worldFanoutChannel } from "./redis-world-fanout.js";
import type {
  PresenceLease,
  PersistSnapshotRev,
  PublishedSessionMetadata,
  SessionStore,
  WorldChatMessage,
  WorldFanoutOptions,
} from "./session-store.js";

const EVENT_LOG_MAX = 200;
const WORLD_CHAT_MAX = 5000;

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
    const coordKeys = snapshot.worldMap.occupants.map(
      (o) => `${Math.round(o.x)},${Math.round(o.y)}`
    );
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

  getHostId(): string {
    return this.hostId;
  }

  getRedis(): Redis {
    return this.redis;
  }
}
