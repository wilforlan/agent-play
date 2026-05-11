import { describe, expect, it } from "vitest";
import {
  createNodeCredentialMaterial,
  nodeCredentialFromHumanPhrase,
} from "@agent-play/node-tools";
import type {
  AgentRepository,
  CreateAgentNodeRecordInput,
  CreateAgentRecordResult,
  CreateNodeRecordInput,
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

  async createNode(input: CreateNodeRecordInput): Promise<CreateNodeResult> {
    if (input.kind === "main") {
      const nodeId = input.nodeId.trim().toLowerCase();
      if (this.nodes.has(nodeId)) {
        throw new Error("createNode: node already exists");
      }
      this.nodes.set(nodeId, {
        nodeId,
        kind: "main",
        parentNodeId: this.rootKey,
        passwHash: input.passwHash,
        createdAt: new Date().toISOString(),
      });
      return { nodeId };
    }
    if (input.passwHash !== undefined) {
      const nodeId = `space-${input.spaceId}`;
      if (this.nodes.has(nodeId)) {
        throw new Error("createNode: node already exists");
      }
      this.nodes.set(nodeId, {
        nodeId,
        kind: "space",
        spaceId: input.spaceId,
        parentNodeId: this.rootKey,
        passwHash: input.passwHash,
        createdAt: new Date().toISOString(),
      });
      return { nodeId };
    }
    const generated = createNodeCredentialMaterial({ rootKey: this.rootKey });
    if (this.nodes.has(generated.nodeId)) {
      throw new Error("createNode: node already exists");
    }
    this.nodes.set(generated.nodeId, {
      nodeId: generated.nodeId,
      kind: "space",
      spaceId: input.spaceId,
      parentNodeId: this.rootKey,
      passwHash: generated.passwHash,
      createdAt: new Date().toISOString(),
    });
    return { nodeId: generated.nodeId, phrase: generated.phrase };
  }

  async verifyNodePasswHash(_input: {
    nodeId: string;
    passwHash: string;
  }): Promise<boolean> {
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
  it("accepts a main body with nodeId and passwHash", () => {
    const r = parseCreateNodeBody({
      kind: "main",
      nodeId: "node-abc",
      passwHash: "deadbeef",
    });
    expect(r).toEqual({
      ok: true,
      kind: "main",
      nodeId: "node-abc",
      passwHash: "deadbeef",
    });
  });

  it("accepts kind space with spaceId only (server-generated phrase)", () => {
    const r = parseCreateNodeBody({ kind: "space", spaceId: "space-1" });
    expect(r).toEqual({ ok: true, kind: "space", spaceId: "space-1" });
  });

  it("accepts kind space with spaceId and a supplied passwHash", () => {
    const r = parseCreateNodeBody({
      kind: "space",
      spaceId: "space-1",
      passwHash: "abc123",
    });
    expect(r).toEqual({
      ok: true,
      kind: "space",
      spaceId: "space-1",
      passwHash: "abc123",
    });
  });

  it("rejects missing nodeId on main", () => {
    const r = parseCreateNodeBody({ kind: "main", passwHash: "abc" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/nodeId/);
  });

  it("rejects missing passwHash on main", () => {
    const r = parseCreateNodeBody({ kind: "main", nodeId: "node-abc" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/passwHash/);
  });
});

describe("createNodeAccount", () => {
  const rootKey = "fixture-root-key";

  it("registers a new node id from a client-derived main credential", async () => {
    const repo = new TestNodeRepository({ rootKey });
    const credential = nodeCredentialFromHumanPhrase({
      phrase: "amber angle apple arch atlas",
      rootKey,
    });
    const { nodeId } = await createNodeAccount(repo, {
      kind: "main",
      nodeId: credential.nodeId,
      passwHash: credential.passwHash,
    });
    expect(nodeId).toBe(credential.nodeId);
    const row = await repo.getNode(nodeId);
    expect(row?.nodeId).toBe(nodeId);
    expect(row?.passwHash).toBe(credential.passwHash);
  });

  it("rejects re-registering the same nodeId", async () => {
    const repo = new TestNodeRepository({ rootKey });
    const credential = nodeCredentialFromHumanPhrase({
      phrase: "amber angle apple arch atlas aura autumn bamboo beacon birch",
      rootKey,
    });
    await createNodeAccount(repo, {
      kind: "main",
      nodeId: credential.nodeId,
      passwHash: credential.passwHash,
    });
    await expect(
      createNodeAccount(repo, {
        kind: "main",
        nodeId: credential.nodeId,
        passwHash: credential.passwHash,
      })
    ).rejects.toThrow(/already exists/);
  });
});
