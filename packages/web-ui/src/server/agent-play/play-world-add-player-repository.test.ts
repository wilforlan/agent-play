import { describe, expect, it } from "vitest";
import {
  nodeCredentialFromHumanPhrase,
  verifyStoredNodeCredential,
} from "@agent-play/node-tools";
import type {
  AgentRepository,
  CreateAgentNodeRecordInput,
  CreateAgentRecordInput,
  CreateAgentRecordResult,
  CreateNodeRecordInput,
  CreateNodeResult,
  NodeAuthRecord,
  StoredAgentRecord,
} from "./agent-repository.js";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

type MainNodeBootstrap = { nodeId: string; passwHash: string };

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
    for (const node of this.nodes.values()) {
      if (node.agentNodeIds?.includes(agentId)) {
        return node.nodeId;
      }
    }
    for (const a of this.agents.values()) {
      if (a.agentId === agentId) {
        return a.nodeId;
      }
    }
    return null;
  }

  async validateNodeIdentity(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: "not used in this test" };
  }

  async createNode(input: CreateNodeRecordInput): Promise<CreateNodeResult> {
    if (input.kind === "main") {
      if (this.nodes.has(input.nodeId)) {
        throw new Error("createNode: node already exists");
      }
      this.nodes.set(input.nodeId, {
        nodeId: input.nodeId,
        kind: "main",
        parentNodeId: this.rootKey,
        passwHash: input.passwHash,
        createdAt: new Date().toISOString(),
        agentNodeIds: [],
      });
      return { nodeId: input.nodeId };
    }
    throw new Error("space node creation not used in this test");
  }

  async verifyNodePasswHash(input: {
    nodeId: string;
    passwHash: string;
  }): Promise<boolean> {
    const node = this.nodes.get(input.nodeId);
    if (node === undefined) {
      return false;
    }
    if (node.passwHash !== input.passwHash) {
      return false;
    }
    return verifyStoredNodeCredential({
      nodeId: input.nodeId,
      passwHash: input.passwHash,
      rootKey: this.rootKey,
    });
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
    const parent = this.nodes.get(input.nodeId);
    if (parent !== undefined) {
      const next = [...(parent.agentNodeIds ?? []), agentId];
      this.nodes.set(input.nodeId, { ...parent, agentNodeIds: next });
    }
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

async function bootstrapMainNode(
  repo: TestAgentRepository,
  options: { phrase: string; rootKey: string }
): Promise<MainNodeBootstrap> {
  const credential = nodeCredentialFromHumanPhrase({
    phrase: options.phrase,
    rootKey: options.rootKey,
  });
  await repo.createNode({
    kind: "main",
    nodeId: credential.nodeId,
    passwHash: credential.passwHash,
  });
  return { nodeId: credential.nodeId, passwHash: credential.passwHash };
}

describe("PlayWorld addPlayer with AgentRepository", () => {
  const TEST_ROOT_KEY = "fixture-root-key";
  const PHRASE_A = "amber angle apple";
  const PHRASE_B = "orchid pearl river";

  it("requires a passwHash when repository is configured", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const main = await bootstrapMainNode(repo, {
      phrase: PHRASE_A,
      rootKey: TEST_ROOT_KEY,
    });
    await repo.createAgent({
      agentId: "agent-requires-passwHash",
      name: "r",
      toolNames: ["chat_tool"],
      nodeId: main.nodeId,
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
        mainNodeId: main.nodeId,
        agentId: "agent-requires-passwHash",
      })
    ).rejects.toThrow(/passwHash/);
  });

  it("loads a registered agent when agentId belongs to the user", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const main = await bootstrapMainNode(repo, {
      phrase: PHRASE_A,
      rootKey: TEST_ROOT_KEY,
    });
    const { agentId } = await repo.createAgent({
      agentId: "agent-remote-demo",
      name: "remote-demo",
      toolNames: ["chat_tool", "increment"],
      nodeId: main.nodeId,
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
      passwHash: main.passwHash,
      agentId,
    });
    expect(p.id).toBe(agentId);
  });

  it("accepts an existing repository row and session player id matches agentId", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const main = await bootstrapMainNode(repo, {
      phrase: PHRASE_A,
      rootKey: TEST_ROOT_KEY,
    });
    const { agentId } = await repo.createAgent({
      agentId: "agent-fresh",
      name: "fresh",
      toolNames: ["chat_tool"],
      nodeId: main.nodeId,
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
      mainNodeId: main.nodeId,
      passwHash: main.passwHash,
      agentId,
    });
    const stored = await repo.getAgent(p.id);
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe("fresh");
    expect(stored?.toolNames).toEqual(["chat_tool"]);
  });

  it("rejects agentId when the supplied passwHash does not belong to mainNodeId", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const mainA = await bootstrapMainNode(repo, {
      phrase: PHRASE_A,
      rootKey: TEST_ROOT_KEY,
    });
    const mainB = await bootstrapMainNode(repo, {
      phrase: PHRASE_B,
      rootKey: TEST_ROOT_KEY,
    });
    const { agentId: otherAgent } = await repo.createAgent({
      agentId: "agent-other",
      name: "other",
      toolNames: ["chat_tool"],
      nodeId: mainB.nodeId,
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
        mainNodeId: mainA.nodeId,
        passwHash: mainA.passwHash,
        agentId: otherAgent,
      })
    ).rejects.toThrow(/does not belong to mainNodeId/);
  });

  it("accepts explicit agentId when it belongs to the user", async () => {
    const repo = new TestAgentRepository({ rootKey: TEST_ROOT_KEY });
    const main = await bootstrapMainNode(repo, {
      phrase: PHRASE_A,
      rootKey: TEST_ROOT_KEY,
    });
    const { agentId } = await repo.createAgent({
      agentId: "agent-ok",
      name: "r",
      toolNames: ["chat_tool"],
      nodeId: main.nodeId,
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
      mainNodeId: main.nodeId,
      passwHash: main.passwHash,
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
