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

const ZONE_FLAG_THRESHOLD = 100;

export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents = new Map<string, StoredAgentRecord>();
  private readonly lookup = new Map<string, string>();

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
    this.agents.set(agentId, rec);
    this.lookup.set(lookupIndex, agentId);
    return { agentId, plainApiKey };
  }

  async verifyApiKeyAndGetAgentId(
    plainApiKey: string
  ): Promise<string | null> {
    const idx = lookupIndexFromPlainKey(plainApiKey);
    const agentId = this.lookup.get(idx);
    if (agentId === undefined) return null;
    const rec = this.agents.get(agentId);
    if (rec === undefined) return null;
    if (!(await verifyApiKeyHash(plainApiKey, rec.apiKeyHash))) return null;
    return agentId;
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
    if (rec.lookupIndex !== undefined) {
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
