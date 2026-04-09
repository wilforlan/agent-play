import { describe, expect, it } from "vitest";
import {
  deriveNodeIdFromPassword,
  validateNodePassword,
} from "@agent-play/node-tools";
import type {
  AgentRepository,
  CreateAgentRecordInput,
  CreateAgentNodeRecordInput,
  CreateAgentRecordResult,
  CreateNodeResult,
  NodeAuthRecord,
  StoredAgentRecord,
} from "./agent-repository.js";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

class TestAgentRepository implements AgentRepository {
  private readonly rootKey: string;
  private readonly nodes = new Map<string, NodeAuthRecord>();
  private readonly agents = new Map<string, StoredAgentRecord>();

  constructor(options: { rootKey: string }) {
    this.rootKey = options.rootKey;
  }

  getGenesisNodeId(): string {
    return this.rootKey;
  }

  async findAccountIdForAgentNode(agentId: string): Promise<string | null> {
    for (const n of this.nodes.keys()) {
      const hasAttached = [...this.agents.values()].some(
        (a) => a.nodeId === n && a.agentId === agentId
      );
      if (hasAttached) {
        return n;
      }
    }
    return null;
  }

  async validateNodeIdentity(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: "not used in this test" };
  }

  async createNode(input: { kind: "main"; passw: string }): Promise<CreateNodeResult> {
    const passw = input.passw;
    const nodeId = deriveNodeIdFromPassword({
      password: passw,
      rootKey: this.rootKey,
    });
    if (this.nodes.has(nodeId)) {
      throw new Error("createNode: node already exists");
    }
    this.nodes.set(nodeId, {
      nodeId,
      kind: "main",
      parentNodeId: this.rootKey,
      createdAt: new Date().toISOString(),
    });
    return { nodeId };
  }

  async verifyNodePassw(nodeId: string, passw: string): Promise<boolean> {
    if (!this.nodes.has(nodeId)) {
      return false;
    }
    return validateNodePassword({ nodeId, password: passw, rootKey: this.rootKey });
  }

  async getNode(nodeId: string): Promise<NodeAuthRecord | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  async deleteMainNodeCascade(
    nodeId: string
  ): Promise<{ deletedAgentCount: number }> {
    if (!this.nodes.has(nodeId)) {
      return { deletedAgentCount: 0 };
    }
    const removed = [...this.agents.values()].filter((a) => a.nodeId === nodeId);
    for (const a of removed) {
      this.agents.delete(a.agentId);
    }
    this.nodes.delete(nodeId);
    return { deletedAgentCount: removed.length };
  }

  async createAgent(
    input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult> {
    const agentId = input.agentId;
    if (agentId.length === 0) {
      throw new Error("agentId required");
    }
    const name = input.name ?? agentId;
    const now = new Date().toISOString();
    this.agents.set(agentId, {
      agentId,
      nodeId: input.nodeId,
      name,
      toolNames: [...input.toolNames],
      zoneCount: 0,
      yieldCount: 0,
      flagged: false,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId };
  }

  async createAgentNode(
    input: CreateAgentNodeRecordInput
  ): Promise<CreateAgentRecordResult> {
    const now = new Date().toISOString();
    this.agents.set(input.agentId, {
      agentId: input.agentId,
      nodeId: input.parentNodeId,
      name: input.agentId,
      toolNames: [],
      zoneCount: 0,
      yieldCount: 0,
      flagged: false,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId: input.agentId };
  }

  async getAgent(agentId: string): Promise<StoredAgentRecord | null> {
    return this.agents.get(agentId) ?? null;
  }

  async listAgentsForNode(nodeId: string): Promise<StoredAgentRecord[]> {
    return [...this.agents.values()].filter((a) => a.nodeId === nodeId);
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    return this.agents.delete(agentId);
  }

  async incrementZoneCount(agentId: string): Promise<StoredAgentRecord | null> {
    const existing = this.agents.get(agentId);
    if (existing === undefined) {
      return null;
    }
    const next: StoredAgentRecord = {
      ...existing,
      zoneCount: existing.zoneCount + 1,
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agentId, next);
    return next;
  }

  async incrementYieldCount(agentId: string): Promise<StoredAgentRecord | null> {
    const existing = this.agents.get(agentId);
    if (existing === undefined) {
      return null;
    }
    const next: StoredAgentRecord = {
      ...existing,
      yieldCount: existing.yieldCount + 1,
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agentId, next);
    return next;
  }
}

describe("PlayWorld addPlayer with AgentRepository", () => {
  const TEST_ROOT_KEY = "fixture-root-key";
  const PASSW = "amber angle apple";

  it("requires account password when repository is configured", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode({ kind: "main", passw: PASSW });
    await repo.createAgent({
      agentId: "agent-requires-password",
      name: "r",
      toolNames: ["chat_tool"],
      nodeId,
    });
    const w = new PlayWorld({
      repository: repo,
      sessionStore: new TestSessionStore(),
    });
    await w.start();

    await expect(
      w.addPlayer({
        name: "x",
        type: "langchain",
        agent: { type: "langchain", toolNames: ["chat_tool"] },
        mainNodeId: nodeId,
        agentId: "any-id",
      })
    ).rejects.toThrow(/password/);
  });

  it("loads a registered agent when agentId belongs to the user", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode({ kind: "main", passw: PASSW });
    const { agentId } = await repo.createAgent({
      agentId: "agent-remote-demo",
      name: "remote-demo",
      toolNames: ["chat_tool", "increment"],
      nodeId,
    });
    const w = new PlayWorld({
      repository: repo,
      sessionStore: new TestSessionStore(),
    });
    await w.start();

    const p = await w.addPlayer({
      name: "remote-demo",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["increment", "chat_tool"] },
      password: PASSW,
      agentId,
    });
    expect(p.id).toBe(agentId);
  });

  it("accepts an existing repository row and session player id matches agentId", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode({ kind: "main", passw: PASSW });
    const { agentId } = await repo.createAgent({
      agentId: "agent-fresh",
      name: "fresh",
      toolNames: ["chat_tool"],
      nodeId,
    });
    const w = new PlayWorld({
      repository: repo,
      sessionStore: new TestSessionStore(),
    });
    await w.start();

    const p = await w.addPlayer({
      name: "fresh",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      mainNodeId: nodeId,
      password: PASSW,
      agentId,
    });
    const stored = await repo.getAgent(p.id);
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe("fresh");
    expect(stored?.toolNames).toEqual(["chat_tool"]);
  });

  it("rejects agentId when password does not match that agent owner", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId: nodeA } = await repo.createNode({ kind: "main", passw: PASSW });
    const { nodeId: nodeB } = await repo.createNode({
      kind: "main",
      passw: "orchid pearl river",
    });
    const { agentId: otherAgent } = await repo.createAgent({
      agentId: "agent-other",
      name: "other",
      toolNames: ["chat_tool"],
      nodeId: nodeB,
    });

    const w = new PlayWorld({
      repository: repo,
      sessionStore: new TestSessionStore(),
    });
    await w.start();

    await expect(
      w.addPlayer({
        name: "x",
        type: "langchain",
        agent: { type: "langchain", toolNames: ["chat_tool"] },
        mainNodeId: nodeA,
        password: PASSW,
        agentId: otherAgent,
      })
    ).rejects.toThrow(/does not belong to mainNodeId/);
  });

  it("accepts explicit agentId when it belongs to the user", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode({ kind: "main", passw: PASSW });
    const { agentId } = await repo.createAgent({
      agentId: "agent-ok",
      name: "r",
      toolNames: ["chat_tool"],
      nodeId,
    });
    const w = new PlayWorld({
      repository: repo,
      sessionStore: new TestSessionStore(),
    });
    await w.start();

    const p = await w.addPlayer({
      name: "ok",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      mainNodeId: nodeId,
      password: PASSW,
      agentId,
    });
    expect(p.id).toBe(agentId);
  });

  it("uses provided agentId as session player id when repository is not configured", async () => {
    const w = new PlayWorld({ sessionStore: new TestSessionStore() });
    await w.start();
    const p = await w.addPlayer({
      name: "x",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "session-local-x",
    });
    expect(p.id).toBe("session-local-x");
  });
});
