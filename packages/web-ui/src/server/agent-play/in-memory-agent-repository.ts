import type {
  AgentRepository,
  CreateAgentRecordInput,
  CreateAgentRecordResult,
  CreateNodeResult,
  NodeAuthRecord,
  StoredAgentRecord,
} from "./agent-repository.js";
import { randomUUID } from "node:crypto";
import { MAX_AGENTS_PER_ACCOUNT } from "./account-limits.js";
import {
  deriveNodeIdFromPassword,
  validateNodePassword,
} from "@agent-play/node-tools";

const ZONE_FLAG_THRESHOLD = 100;

export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents = new Map<string, StoredAgentRecord>();
  private readonly nodes = new Map<string, NodeAuthRecord>();
  private readonly rootKey: string;

  constructor(options?: { rootKey?: string }) {
    this.rootKey = options?.rootKey ?? "";
    if (this.rootKey.length === 0) {
      throw new Error("InMemoryAgentRepository: rootKey is required");
    }
  }

  async createNode(passw: string): Promise<CreateNodeResult> {
    const nodeId = deriveNodeIdFromPassword({
      password: passw,
      rootKey: this.rootKey,
    });
    if (this.nodes.has(nodeId)) {
      throw new Error("createNode: node already exists");
    }
    const createdAt = new Date().toISOString();
    this.nodes.set(nodeId, { nodeId, createdAt });
    return { nodeId };
  }

  async verifyNodePassw(nodeId: string, passw: string): Promise<boolean> {
    const node = this.nodes.get(nodeId);
    if (node === undefined) return false;
    return validateNodePassword({
      nodeId,
      password: passw,
      rootKey: this.rootKey,
    });
  }

  async getNode(nodeId: string): Promise<NodeAuthRecord | null> {
    const n = this.nodes.get(nodeId);
    return n === undefined ? null : { ...n };
  }

  async createAgent(
    input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult> {
    if (!this.nodes.has(input.nodeId)) {
      throw new Error("createAgent: node does not exist");
    }
    const existing = [...this.agents.values()].filter(
      (a) => a.nodeId === input.nodeId
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
      nodeId: input.nodeId,
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

  async getAgent(agentId: string): Promise<StoredAgentRecord | null> {
    const r = this.agents.get(agentId);
    return r === undefined ? null : { ...r };
  }

  async listAgentsForNode(nodeId: string): Promise<StoredAgentRecord[]> {
    return [...this.agents.values()]
      .filter((a) => a.nodeId === nodeId)
      .map((a) => ({ ...a }));
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const rec = this.agents.get(agentId);
    if (rec === undefined) return false;
    this.agents.delete(agentId);
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
