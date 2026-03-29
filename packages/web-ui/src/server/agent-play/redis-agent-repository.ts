import type {
  AgentRepository,
  ApiKeyMetadata,
  CreateAgentRecordInput,
  CreateAgentRecordResult,
  CreateApiKeyResult,
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
import {
  MAX_AGENTS_PER_ACCOUNT,
  MAX_API_KEYS_PER_ACCOUNT,
} from "./account-limits.js";

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

function userAccountApiKeyKey(hostId: string, userId: string): string {
  return `agent-play:${hostId}:account:${userId}:apiKey`;
}

function recordToHash(rec: StoredAgentRecord): Record<string, string> {
  const o: Record<string, string> = {
    agentId: rec.agentId,
    userId: rec.userId,
    name: rec.name,
    toolNames: JSON.stringify(rec.toolNames),
    zoneCount: String(rec.zoneCount),
    yieldCount: String(rec.yieldCount),
    flagged: rec.flagged ? "1" : "0",
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
  if (rec.apiKeyHash !== undefined && rec.apiKeyHash.length > 0) {
    o.apiKeyHash = rec.apiKeyHash;
  }
  if (rec.lookupIndex !== undefined && rec.lookupIndex.length > 0) {
    o.lookupIndex = rec.lookupIndex;
  }
  return o;
}

function hashToRecord(h: Record<string, string>): StoredAgentRecord | null {
  const agentId = h.agentId;
  const userId = h.userId;
  const name = h.name;
  const toolNamesRaw = h.toolNames;
  if (
    agentId === undefined ||
    userId === undefined ||
    userId.length === 0 ||
    name === undefined ||
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
  const apiKeyHash =
    typeof h.apiKeyHash === "string" && h.apiKeyHash.length > 0
      ? h.apiKeyHash
      : undefined;
  const lookupIndex =
    typeof h.lookupIndex === "string" && h.lookupIndex.length > 0
      ? h.lookupIndex
      : undefined;
  return {
    agentId,
    userId,
    name,
    toolNames,
    apiKeyHash,
    lookupIndex,
    zoneCount: Number(h.zoneCount ?? 0),
    yieldCount: Number(h.yieldCount ?? 0),
    flagged: h.flagged === "1",
    createdAt: h.createdAt ?? new Date(0).toISOString(),
    updatedAt: h.updatedAt ?? new Date(0).toISOString(),
  };
}

function userKeyPrefix(userId: string): string {
  return `u:${userId}`;
}

function parseUserIdFromLookupValue(raw: string): string | null {
  if (raw.startsWith("u:")) {
    return raw.slice(2);
  }
  return null;
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

  async createApiKey(userId: string): Promise<CreateApiKeyResult> {
    const accKey = userAccountApiKeyKey(this.hostId, userId);
    const exists = await this.redis.exists(accKey);
    if (exists === 1) {
      throw new Error(
        "createApiKey: an API key already exists for this account; delete it or use key rotation when supported"
      );
    }
    if (MAX_API_KEYS_PER_ACCOUNT < 1) {
      throw new Error("createApiKey: API keys are disabled for this deployment");
    }
    const plainApiKey = generatePlainApiKey();
    const apiKeyHash = await hashApiKey(plainApiKey);
    const lookupIndex = lookupIndexFromPlainKey(plainApiKey);
    const createdAt = new Date().toISOString();
    const pipe = this.redis.multi();
    pipe.hset(accKey, "apiKeyHash", apiKeyHash);
    pipe.hset(accKey, "lookupIndex", lookupIndex);
    pipe.hset(accKey, "createdAt", createdAt);
    pipe.set(lookupKey(this.hostId, lookupIndex), userKeyPrefix(userId));
    await pipe.exec();
    return { plainApiKey };
  }

  async getApiKeyMetadata(userId: string): Promise<ApiKeyMetadata> {
    const accKey = userAccountApiKeyKey(this.hostId, userId);
    const raw = await this.redis.hgetall(accKey);
    if (Object.keys(raw).length === 0) {
      return { hasKey: false };
    }
    const createdAt =
      typeof raw.createdAt === "string" ? raw.createdAt : undefined;
    return { hasKey: true, createdAt };
  }

  async createAgent(
    input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult> {
    const ids = await this.redis.smembers(
      userAgentsKey(this.hostId, input.userId)
    );
    if (ids.length >= MAX_AGENTS_PER_ACCOUNT) {
      throw new Error(
        `createAgent: account agent limit reached (max ${String(MAX_AGENTS_PER_ACCOUNT)})`
      );
    }
    const agentId = randomUUID();
    const now = new Date().toISOString();
    const rec: StoredAgentRecord = {
      agentId,
      userId: input.userId,
      name: input.name,
      toolNames: [...input.toolNames],
      zoneCount: 0,
      yieldCount: 0,
      flagged: false,
      createdAt: now,
      updatedAt: now,
    };
    const key = agentKey(this.hostId, agentId);
    const pipe = this.redis.multi();
    pipe.hset(key, recordToHash(rec));
    pipe.sadd(userAgentsKey(this.hostId, input.userId), agentId);
    await pipe.exec();
    return { agentId };
  }

  async verifyApiKeyForUser(
    plainApiKey: string
  ): Promise<string | null> {
    const idx = lookupIndexFromPlainKey(plainApiKey);
    const raw = await this.redis.get(lookupKey(this.hostId, idx));
    if (raw === null || raw.length === 0) return null;
    const userIdFromPrefix = parseUserIdFromLookupValue(raw);
    if (userIdFromPrefix !== null) {
      const acc = await this.redis.hgetall(
        userAccountApiKeyKey(this.hostId, userIdFromPrefix)
      );
      if (Object.keys(acc).length === 0) return null;
      const h = acc.apiKeyHash;
      if (typeof h !== "string" || !(await verifyApiKeyHash(plainApiKey, h))) {
        return null;
      }
      return userIdFromPrefix;
    }
    const agentId = raw;
    const agentRaw = await this.redis.hgetall(agentKey(this.hostId, agentId));
    if (Object.keys(agentRaw).length === 0) return null;
    const rec = hashToRecord(agentRaw);
    if (rec === null) return null;
    if (
      rec.apiKeyHash === undefined ||
      rec.apiKeyHash.length === 0 ||
      rec.lookupIndex === undefined
    ) {
      return null;
    }
    if (!(await verifyApiKeyHash(plainApiKey, rec.apiKeyHash))) return null;
    return rec.userId;
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
    if (rec.lookupIndex !== undefined && rec.lookupIndex.length > 0) {
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
  redisUrl?: string;
  hostId: string;
  redis?: Redis;
}): RedisAgentRepository {
  if (options.redis !== undefined) {
    return new RedisAgentRepository({
      redis: options.redis,
      hostId: options.hostId,
    });
  }
  const url = options.redisUrl;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("createRedisAgentRepository: redisUrl or redis is required");
  }
  const redis = new Redis(url);
  return new RedisAgentRepository({ redis, hostId: options.hostId });
}
