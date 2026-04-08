import type {
  AgentRepository,
  CreateAgentRecordInput,
  CreateAgentRecordResult,
  CreateNodeResult,
  NodeAuthRecord,
  StoredAgentRecord,
} from "./agent-repository.js";
import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import { MAX_AGENTS_PER_ACCOUNT } from "./account-limits.js";
import {
  deriveNodeIdFromPassword,
  loadRootKey,
  validateNodePassword,
} from "@agent-play/node-tools";

const ZONE_FLAG_THRESHOLD = 100;

function agentKey(hostId: string, agentId: string): string {
  return `agent-play:${hostId}:agent:${agentId}`;
}

function userAgentsKey(hostId: string, nodeId: string): string {
  return `agent-play:${hostId}:node:${nodeId}:agents`;
}

function nodeAuthKey(hostId: string, nodeId: string): string {
  return `agent-play:${hostId}:node:${nodeId}:auth`;
}

function recordToHash(rec: StoredAgentRecord): Record<string, string> {
  const o: Record<string, string> = {
    agentId: rec.agentId,
    nodeId: rec.nodeId,
    name: rec.name,
    toolNames: JSON.stringify(rec.toolNames),
    zoneCount: String(rec.zoneCount),
    yieldCount: String(rec.yieldCount),
    flagged: rec.flagged ? "1" : "0",
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
  return o;
}

function hashToRecord(h: Record<string, string>): StoredAgentRecord | null {
  const agentId = h.agentId;
  const nodeId = h.nodeId;
  const name = h.name;
  const toolNamesRaw = h.toolNames;
  if (
    agentId === undefined ||
    nodeId === undefined ||
    nodeId.length === 0 ||
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
  return {
    agentId,
    nodeId,
    name,
    toolNames,
    zoneCount: Number(h.zoneCount ?? 0),
    yieldCount: Number(h.yieldCount ?? 0),
    flagged: h.flagged === "1",
    createdAt: h.createdAt ?? new Date(0).toISOString(),
    updatedAt: h.updatedAt ?? new Date(0).toISOString(),
  };
}

export type RedisAgentRepositoryOptions = {
  redis: Redis;
  hostId: string;
  rootKey: string;
};

export class RedisAgentRepository implements AgentRepository {
  private readonly redis: Redis;
  private readonly hostId: string;
  private readonly rootKey: string;

  constructor(options: RedisAgentRepositoryOptions) {
    this.redis = options.redis;
    this.hostId = options.hostId;
    this.rootKey = options.rootKey;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async createNode(passw: string): Promise<CreateNodeResult> {
    const nodeId = deriveNodeIdFromPassword({
      password: passw,
      rootKey: this.rootKey,
    });
    const authKey = nodeAuthKey(this.hostId, nodeId);
    const exists = await this.redis.exists(authKey);
    if (exists === 1) {
      throw new Error("createNode: invalid node information");
    }
    const createdAt = new Date().toISOString();
    await this.redis.hset(authKey, {
      nodeId,
      createdAt,
    });
    return { nodeId };
  }

  async verifyNodePassw(nodeId: string, passw: string): Promise<boolean> {
    const raw = await this.redis.hgetall(nodeAuthKey(this.hostId, nodeId));
    if (Object.keys(raw).length === 0) return false;
    return validateNodePassword({
      nodeId,
      password: passw,
      rootKey: this.rootKey,
    });
  }

  async getNode(nodeId: string): Promise<NodeAuthRecord | null> {
    const raw = await this.redis.hgetall(nodeAuthKey(this.hostId, nodeId));
    if (Object.keys(raw).length === 0) return null;
    if (
      typeof raw.createdAt !== "string"
    ) {
      return null;
    }
    return { nodeId, createdAt: raw.createdAt };
  }

  async createAgent(
    input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult> {
    const ids = await this.redis.smembers(
      userAgentsKey(this.hostId, input.nodeId)
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
      nodeId: input.nodeId,
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
    pipe.sadd(userAgentsKey(this.hostId, input.nodeId), agentId);
    await pipe.exec();
    return { agentId };
  }


  async getAgent(agentId: string): Promise<StoredAgentRecord | null> {
    const raw = await this.redis.hgetall(agentKey(this.hostId, agentId));
    if (Object.keys(raw).length === 0) return null;
    return hashToRecord(raw);
  }

  async listAgentsForNode(userId: string): Promise<StoredAgentRecord[]> {
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
    pipe.srem(userAgentsKey(this.hostId, rec.nodeId), agentId);
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
  rootKey?: string;
}): RedisAgentRepository {
  const rootKey =
    typeof options.rootKey === "string" && options.rootKey.length > 0
      ? options.rootKey
      : loadRootKey();
  if (options.redis !== undefined) {
    return new RedisAgentRepository({
      redis: options.redis,
      hostId: options.hostId,
      rootKey,
    });
  }
  const url = options.redisUrl;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("createRedisAgentRepository: redisUrl or redis is required");
  }
  const redis = new Redis(url);
  return new RedisAgentRepository({ redis, hostId: options.hostId, rootKey });
}
