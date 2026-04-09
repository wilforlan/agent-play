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
  PersistSnapshotRev,
  PublishedSessionMetadata,
  SessionStore,
  WorldFanoutOptions,
} from "./session-store.js";

const EVENT_LOG_MAX = 200;

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

function gridOccupiedKey(hostId: string): string {
  return `agent-play:${hostId}:session:grid:occupied`;
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
      "merkleRootHex",
      "merkleLeafCount"
    );
    await chain.exec();
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

  getHostId(): string {
    return this.hostId;
  }

  getRedis(): Redis {
    return this.redis;
  }
}
