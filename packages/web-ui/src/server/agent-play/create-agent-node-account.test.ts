import { describe, expect, it } from "vitest";
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
  createAgentNodeAccount,
  parseCreateAgentNodeBody,
} from "./create-agent-node-account.js";

class TestAgentNodeRepository implements AgentRepository {
  public lastCreateAgentNodeInput: CreateAgentNodeRecordInput | null = null;

  getGenesisNodeId(): string {
    return "fixture-root-key";
  }

  async findAccountIdForAgentNode(_agentId: string): Promise<string | null> {
    return null;
  }

  async validateNodeIdentity(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: "not used in this test" };
  }

  async createNode(_input: CreateNodeRecordInput): Promise<CreateNodeResult> {
    throw new Error("not used in this test");
  }

  async verifyNodePasswHash(_input: {
    nodeId: string;
    passwHash: string;
  }): Promise<boolean> {
    return false;
  }

  async getNode(_nodeId: string): Promise<NodeAuthRecord | null> {
    return null;
  }

  async deleteMainNodeCascade(
    _nodeId: string
  ): Promise<{ deletedAgentCount: number }> {
    return { deletedAgentCount: 0 };
  }

  async createAgentNode(
    input: CreateAgentNodeRecordInput
  ): Promise<CreateAgentRecordResult> {
    this.lastCreateAgentNodeInput = input;
    return { agentId: input.agentId };
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

describe("parseCreateAgentNodeBody", () => {
  it("accepts agentNodeId with agentNodePasswHash", () => {
    expect(
      parseCreateAgentNodeBody({
        kind: "agent",
        agentNodeId: "agent-node-1",
        agentNodePasswHash: "hashed-material",
      })
    ).toEqual({
      ok: true,
      kind: "agent",
      agentNodeId: "agent-node-1",
      agentNodePasswHash: "hashed-material",
    });
  });

  it("accepts agentNodeId when kind is omitted", () => {
    expect(
      parseCreateAgentNodeBody({
        agentNodeId: "agent-node-1",
        agentNodePasswHash: "hashed-material",
      })
    ).toEqual({
      ok: true,
      kind: "agent",
      agentNodeId: "agent-node-1",
      agentNodePasswHash: "hashed-material",
    });
  });

  it("rejects missing agentNodeId", () => {
    const r = parseCreateAgentNodeBody({ agentNodePasswHash: "x" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing agentNodePasswHash", () => {
    const r = parseCreateAgentNodeBody({ agentNodeId: "agent-node-1" });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid body", () => {
    const r = parseCreateAgentNodeBody(null);
    expect(r.ok).toBe(false);
  });
});

describe("createAgentNodeAccount", () => {
  it("forwards the hashed material to the repository as passwHash", async () => {
    const repo = new TestAgentNodeRepository();
    const created = await createAgentNodeAccount({
      repository: repo,
      mainNodeId: "main-node-1",
      agentNodeId: "agent-node-1",
      agentNodePasswHash: "hashed-material",
    });
    expect(created.agentId).toBe("agent-node-1");
    expect(repo.lastCreateAgentNodeInput).toEqual({
      parentNodeId: "main-node-1",
      agentId: "agent-node-1",
      passwHash: "hashed-material",
    });
  });
});
