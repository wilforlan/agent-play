import type {
  AgentRepository,
  CreateAgentRecordInput,
  CreateAgentRecordResult,
  StoredAgentRecord,
} from "./agent-repository.js";
import {
  generatePlainApiKey,
  hashApiKey,
  lookupIndexFromPlainKey,
  verifyApiKeyHash,
} from "./api-key-crypto.js";
import { randomUUID } from "node:crypto";
import Redis from "ioredis";

const ZONE_FLAG_THRESHOLD = 100;

function agentKey(hostId: string, agentId: string): string {
  return `agent-play:${hostId}:agent:${agentId}`;
}

function lookupKey(hostId: string, lookupIndex: string): string {
  return `agent-play:${hostId}:lookup:${lookupIndex}`;
}

function userAgentsKey(hostId: string, userId: string): string {
  return `agent-play:${hostId}:user:${userId}:agents`;
}

function recordToHash(rec: StoredAgentRecord): Record<string, string> {
  const o: Record<string, string> = {
    agentId: rec.agentId,
    userId: rec.userId,
    name: rec.name,
    apiKeyHash: rec.apiKeyHash,
    toolNames: JSON.stringify(rec.toolNames),
    zoneCount: String(rec.zoneCount),
    yieldCount: String(rec.yieldCount),
    flagged: rec.flagged ? "1" : "0",
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
  if (rec.lookupIndex !== undefined) o.lookupIndex = rec.lookupIndex;
  return o;
}

function hashToRecord(h: Record<string, string>): StoredAgentRecord | null {
  const agentId = h.agentId;
  const userId = h.userId;
  const name = h.name;
  const apiKeyHash = h.apiKeyHash;
  const toolNamesRaw = h.toolNames;
  if (
    agentId === undefined ||
    userId === undefined ||
    userId.length === 0 ||
    name === undefined ||
    apiKeyHash === undefined ||
    toolNamesRaw === undefined
  ) {
    return null;
  }
  let toolNames: string[] = [];
  try {
    const p = JSON.parse(toolNamesRaw) as unknown;
    if (Array.isArray(p)) {
      toolNames = p.filter((x): x is string => typeof x === "string");
    }
  } catch {
    return null;
  }
  return {
    agentId,
    userId,
    name,
    apiKeyHash,
    toolNames,
    zoneCount: Number(h.zoneCount ?? 0),
    yieldCount: Number(h.yieldCount ?? 0),
    flagged: h.flagged === "1",
    createdAt: h.createdAt ?? new Date(0).toISOString(),
    updatedAt: h.updatedAt ?? new Date(0).toISOString(),
    lookupIndex: h.lookupIndex,
  };
}

export type RedisAgentRepositoryOptions = {
  redis: Redis;
  hostId: string;
};

export class RedisAgentRepository implements AgentRepository {
  private readonly redis: Redis;
  private readonly hostId: string;

  constructor(options: RedisAgentRepositoryOptions) {
    this.redis = options.redis;
    this.hostId = options.hostId;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async createAgent(
    input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult> {
    const plainApiKey = generatePlainApiKey();
    const apiKeyHash = await hashApiKey(plainApiKey);
    const lookupIndex = lookupIndexFromPlainKey(plainApiKey);
    const agentId = randomUUID();
    const now = new Date().toISOString();
    const rec: StoredAgentRecord = {
      agentId,
      userId: input.userId,
      name: input.name,
      apiKeyHash,
      toolNames: [...input.toolNames],
      zoneCount: 0,
      yieldCount: 0,
      flagged: false,
      createdAt: now,
      updatedAt: now,
      lookupIndex,
    };
    const key = agentKey(this.hostId, agentId);
    const idx = lookupIndexFromPlainKey(plainApiKey);
    const pipe = this.redis.multi();
    pipe.hset(key, recordToHash(rec));
    pipe.set(lookupKey(this.hostId, idx), agentId);
    pipe.sadd(userAgentsKey(this.hostId, input.userId), agentId);
    await pipe.exec();
    return { agentId, plainApiKey };
  }

  async verifyApiKeyAndGetAgentId(
    plainApiKey: string
  ): Promise<string | null> {
    const idx = lookupIndexFromPlainKey(plainApiKey);
    const agentId = await this.redis.get(lookupKey(this.hostId, idx));
    if (agentId === null || agentId.length === 0) return null;
    const raw = await this.redis.hgetall(agentKey(this.hostId, agentId));
    if (Object.keys(raw).length === 0) return null;
    const rec = hashToRecord(raw);
    if (rec === null) return null;
    if (!(await verifyApiKeyHash(plainApiKey, rec.apiKeyHash))) return null;
    return agentId;
  }

  async getAgent(agentId: string): Promise<StoredAgentRecord | null> {
    const raw = await this.redis.hgetall(agentKey(this.hostId, agentId));
    if (Object.keys(raw).length === 0) return null;
    return hashToRecord(raw);
  }

  async listAgentsForUser(userId: string): Promise<StoredAgentRecord[]> {
    const ids = await this.redis.smembers(
      userAgentsKey(this.hostId, userId)
    );
    const out: StoredAgentRecord[] = [];
    for (const id of ids) {
      const r = await this.getAgent(id);
      if (r !== null) out.push(r);
    }
    return out;
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const raw = await this.redis.hgetall(agentKey(this.hostId, agentId));
    if (Object.keys(raw).length === 0) return false;
    const rec = hashToRecord(raw);
    if (rec === null) return false;
    const pipe = this.redis.multi();
    pipe.del(agentKey(this.hostId, agentId));
    pipe.srem(userAgentsKey(this.hostId, rec.userId), agentId);
    if (rec.lookupIndex !== undefined) {
      pipe.del(lookupKey(this.hostId, rec.lookupIndex));
    }
    await pipe.exec();
    return true;
  }

  async incrementZoneCount(
    agentId: string
  ): Promise<StoredAgentRecord | null> {
    const key = agentKey(this.hostId, agentId);
    const n = await this.redis.hincrby(key, "zoneCount", 1);
    const flagged = n >= ZONE_FLAG_THRESHOLD ? "1" : "0";
    await this.redis.hset(key, "flagged", flagged);
    await this.redis.hset(key, "updatedAt", new Date().toISOString());
    return this.getAgent(agentId);
  }

  async incrementYieldCount(
    agentId: string
  ): Promise<StoredAgentRecord | null> {
    const key = agentKey(this.hostId, agentId);
    await this.redis.hincrby(key, "yieldCount", 1);
    await this.redis.hset(key, "updatedAt", new Date().toISOString());
    return this.getAgent(agentId);
  }
}

export function createRedisAgentRepository(options: {
  redisUrl: string;
  hostId: string;
}): RedisAgentRepository {
  const redis = new Redis(options.redisUrl);
  return new RedisAgentRepository({ redis, hostId: options.hostId });
}
