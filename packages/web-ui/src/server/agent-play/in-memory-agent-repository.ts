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
import {
  MAX_AGENTS_PER_ACCOUNT,
  MAX_API_KEYS_PER_ACCOUNT,
} from "./account-limits.js";

const ZONE_FLAG_THRESHOLD = 100;

function userKeyPrefix(userId: string): string {
  return `u:${userId}`;
}

function parseUserIdFromLookupValue(raw: string): string | null {
  if (raw.startsWith("u:")) {
    return raw.slice(2);
  }
  return null;
}

export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents = new Map<string, StoredAgentRecord>();
  private readonly lookup = new Map<string, string>();
  private readonly userAccountKeys = new Map<
    string,
    { apiKeyHash: string; lookupIndex: string; createdAt: string }
  >();

  async createApiKey(userId: string): Promise<CreateApiKeyResult> {
    const existing = this.userAccountKeys.get(userId);
    if (existing !== undefined) {
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
    this.userAccountKeys.set(userId, { apiKeyHash, lookupIndex, createdAt });
    this.lookup.set(lookupIndex, userKeyPrefix(userId));
    return { plainApiKey };
  }

  async getApiKeyMetadata(userId: string): Promise<ApiKeyMetadata> {
    const row = this.userAccountKeys.get(userId);
    if (row === undefined) {
      return { hasKey: false };
    }
    return { hasKey: true, createdAt: row.createdAt };
  }

  async createAgent(
    input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult> {
    const existing = [...this.agents.values()].filter(
      (a) => a.userId === input.userId
    );
    if (existing.length >= MAX_AGENTS_PER_ACCOUNT) {
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
    this.agents.set(agentId, rec);
    return { agentId };
  }

  async verifyApiKeyForUser(
    plainApiKey: string
  ): Promise<string | null> {
    const idx = lookupIndexFromPlainKey(plainApiKey);
    const raw = this.lookup.get(idx);
    if (raw === undefined) return null;
    const fromUserPrefix = parseUserIdFromLookupValue(raw);
    if (fromUserPrefix !== null) {
      const row = this.userAccountKeys.get(fromUserPrefix);
      if (row === undefined) return null;
      if (!(await verifyApiKeyHash(plainApiKey, row.apiKeyHash))) return null;
      return fromUserPrefix;
    }
    const agentId = raw;
    const rec = this.agents.get(agentId);
    if (rec === undefined) return null;
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
    const r = this.agents.get(agentId);
    return r === undefined ? null : { ...r };
  }

  async listAgentsForUser(userId: string): Promise<StoredAgentRecord[]> {
    return [...this.agents.values()]
      .filter((a) => a.userId === userId)
      .map((a) => ({ ...a }));
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const rec = this.agents.get(agentId);
    if (rec === undefined) return false;
    this.agents.delete(agentId);
    if (rec.lookupIndex !== undefined && rec.lookupIndex.length > 0) {
      this.lookup.delete(rec.lookupIndex);
    }
    return true;
  }

  async incrementZoneCount(
    agentId: string
  ): Promise<StoredAgentRecord | null> {
    const rec = this.agents.get(agentId);
    if (rec === undefined) return null;
    const zoneCount = rec.zoneCount + 1;
    const flagged = zoneCount >= ZONE_FLAG_THRESHOLD;
    const next: StoredAgentRecord = {
      ...rec,
      zoneCount,
      flagged,
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agentId, next);
    return { ...next };
  }

  async incrementYieldCount(
    agentId: string
  ): Promise<StoredAgentRecord | null> {
    const rec = this.agents.get(agentId);
    if (rec === undefined) return null;
    const yieldCount = rec.yieldCount + 1;
    const next: StoredAgentRecord = {
      ...rec,
      yieldCount,
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agentId, next);
    return { ...next };
  }
}
