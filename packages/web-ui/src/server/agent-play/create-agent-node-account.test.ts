import { describe, expect, it } from "vitest";
import type {
  AgentRepository,
  CreateAgentNodeRecordInput,
  CreateAgentRecordResult,
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

  async createNode(_input: { kind: "main"; passw: string }): Promise<CreateNodeResult> {
    throw new Error("not used in this test");
  }

  async verifyNodePassw(_nodeId: string, _passw: string): Promise<boolean> {
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
  it("accepts agentNodeId", () => {
    expect(
      parseCreateAgentNodeBody({
        kind: "agent",
        agentNodeId: "agent-node-1",
        agentNodePassw: "amber angle apple",
      })
    ).toEqual({
      ok: true,
      kind: "agent",
      agentNodeId: "agent-node-1",
      agentNodePassw: "amber angle apple",
    });
  });

  it("accepts agentNodeId when kind is omitted", () => {
    expect(
      parseCreateAgentNodeBody({
        agentNodeId: "agent-node-1",
        agentNodePassw: "amber angle apple",
      })
    ).toEqual({
      ok: true,
      kind: "agent",
      agentNodeId: "agent-node-1",
      agentNodePassw: "amber angle apple",
    });
  });

  it("rejects missing agentNodeId", () => {
    const r = parseCreateAgentNodeBody({});
    expect(r.ok).toBe(false);
  });

  it("rejects invalid body", () => {
    const r = parseCreateAgentNodeBody(null);
    expect(r.ok).toBe(false);
  });
});

describe("createAgentNodeAccount", () => {
  it("attaches provided agent node id to the provided main node id", async () => {
    const repo = new TestAgentNodeRepository();
    const created = await createAgentNodeAccount({
      repository: repo,
      mainNodeId: "main-node-1",
      agentNodeId: "agent-node-1",
      agentNodePassw: "amber angle apple",
    });
    expect(created.agentId).toBe("agent-node-1");
    expect(repo.lastCreateAgentNodeInput).toEqual({
      parentNodeId: "main-node-1",
      agentId: "agent-node-1",
      passw: "amber angle apple",
    });
  });
});
