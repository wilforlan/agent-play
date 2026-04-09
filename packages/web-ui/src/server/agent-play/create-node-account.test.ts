import { describe, expect, it } from "vitest";
import { deriveNodeIdFromPassword } from "@agent-play/node-tools";
import type {
  AgentRepository,
  CreateAgentRecordInput,
  CreateAgentNodeRecordInput,
  CreateAgentRecordResult,
  CreateNodeResult,
  NodeAuthRecord,
  StoredAgentRecord,
} from "./agent-repository.js";
import {
  createNodeAccount,
  parseCreateNodeBody,
} from "./create-node-account.js";

class TestNodeRepository implements AgentRepository {
  private readonly nodes = new Map<string, NodeAuthRecord>();
  private readonly rootKey: string;

  constructor(options: { rootKey: string }) {
    this.rootKey = options.rootKey;
  }

  getGenesisNodeId(): string {
    return this.rootKey;
  }

  async findAccountIdForAgentNode(_agentId: string): Promise<string | null> {
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

  async verifyNodePassw(_nodeId: string, _passw: string): Promise<boolean> {
    return false;
  }

  async getNode(nodeId: string): Promise<NodeAuthRecord | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  async deleteMainNodeCascade(
    _nodeId: string
  ): Promise<{ deletedAgentCount: number }> {
    return { deletedAgentCount: 0 };
  }

  async createAgent(
    _input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult> {
    throw new Error("not used in this test");
  }

  async createAgentNode(
    _input: CreateAgentNodeRecordInput
  ): Promise<CreateAgentRecordResult> {
    throw new Error("not used in this test");
  }

  async getAgent(_agentId: string): Promise<StoredAgentRecord | null> {
    return null;
  }

  async listAgentsForNode(_nodeId: string): Promise<StoredAgentRecord[]> {
    return [];
  }

  async deleteAgent(_agentId: string): Promise<boolean> {
    return false;
  }

  async incrementZoneCount(_agentId: string): Promise<StoredAgentRecord | null> {
    return null;
  }

  async incrementYieldCount(
    _agentId: string
  ): Promise<StoredAgentRecord | null> {
    return null;
  }
}

describe("parseCreateNodeBody", () => {
  it("accepts a non-empty passw string", () => {
    const r = parseCreateNodeBody({ kind: "main", passw: "hello world phrase" });
    expect(r).toEqual({ ok: true, kind: "main", passw: "hello world phrase" });
  });

  it("rejects missing passw", () => {
    const r = parseCreateNodeBody({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/passw/);
  });
});

describe("createNodeAccount", () => {
  const rootKey = "fixture-root-key";

  it("registers a new node id for a unique passphrase", async () => {
    const repo = new TestNodeRepository({ rootKey });
    const { nodeId } = await createNodeAccount(repo, {
      kind: "main",
      passw: "amber angle apple arch atlas",
    });
    expect(nodeId.length).toBeGreaterThan(0);
    const row = await repo.getNode(nodeId);
    expect(row?.nodeId).toBe(nodeId);
  });

  it("rejects duplicate passphrase registration", async () => {
    const repo = new TestNodeRepository({ rootKey });
    const passw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    await createNodeAccount(repo, { kind: "main", passw });
    await expect(createNodeAccount(repo, { kind: "main", passw })).rejects.toThrow(
      /already exists/
    );
  });
});
