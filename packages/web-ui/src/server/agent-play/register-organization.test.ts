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
  listOrganizations,
  organizationKey,
  organizationsIndexKey,
  parseRegisterOrganizationBody,
  registerOrganization,
  type OrganizationRedis,
} from "./register-organization.js";

class MemoryOrganizationRedis implements OrganizationRedis {
  readonly hashes = new Map<string, Record<string, string>>();
  readonly sets = new Map<string, Set<string>>();

  async hset(
    key: string,
    fields: Record<string, string>,
  ): Promise<number> {
    const current = this.hashes.get(key) ?? {};
    this.hashes.set(key, { ...current, ...fields });
    return Object.keys(fields).length;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return { ...(this.hashes.get(key) ?? {}) };
  }

  async sadd(key: string, member: string): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>();
    const before = set.size;
    set.add(member);
    this.sets.set(key, set);
    return set.size === before ? 0 : 1;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? new Set<string>())];
  }
}

class FakeAgentRepository implements AgentRepository {
  readonly nodes = new Map<string, NodeAuthRecord>();

  getGenesisNodeId(): string {
    return "root-key";
  }

  async findAccountIdForAgentNode(_agentId: string): Promise<string | null> {
    return null;
  }

  async validateNodeIdentity(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: "unused" };
  }

  async createNode(input: CreateNodeRecordInput): Promise<CreateNodeResult> {
    if (input.kind !== "main") {
      throw new Error("expected main node");
    }
    const nodeId = input.nodeId.trim().toLowerCase();
    if (this.nodes.has(nodeId)) {
      throw new Error("createNode: node already exists");
    }
    this.nodes.set(nodeId, {
      nodeId,
      kind: "main",
      parentNodeId: "root-key",
      passwHash: input.passwHash,
      createdAt: new Date().toISOString(),
    });
    return { nodeId };
  }

  async verifyNodePasswHash(): Promise<boolean> {
    return false;
  }

  async getNode(nodeId: string): Promise<NodeAuthRecord | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  async deleteMainNodeCascade(): Promise<{ deletedAgentCount: number }> {
    return { deletedAgentCount: 0 };
  }

  async createAgentNode(
    _input: CreateAgentNodeRecordInput,
  ): Promise<CreateAgentRecordResult> {
    return { agentId: "unused" };
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

  async incrementZoneCount(
    _agentId: string,
  ): Promise<StoredAgentRecord | null> {
    return null;
  }

  async incrementYieldCount(
    _agentId: string,
  ): Promise<StoredAgentRecord | null> {
    return null;
  }
}

describe("registerOrganization", () => {
  it("rejects incomplete organization details", () => {
    expect(parseRegisterOrganizationBody({})).toEqual({
      ok: false,
      error: "organizationName required",
    });
    expect(
      parseRegisterOrganizationBody({
        organizationName: "Northwind",
        email: "not-an-email",
      }),
    ).toEqual({ ok: false, error: "email required" });
  });

  it("stores the organization in Redis, creates a main node, and returns downloadable credentials", async () => {
    const repository = new FakeAgentRepository();
    const redis = new MemoryOrganizationRedis();
    const phrase =
      "alpha bravo charlie delta echo foxtrot golf hotel india juliet";

    const result = await registerOrganization({
      repository,
      redis,
      hostId: "default",
      serverUrl: "https://agent-play.com",
      input: {
        organizationName: "Northwind Agents",
        email: "ops@northwind.test",
        website: "https://northwind.test",
        details: "Helpdesk and onboarding agents",
      },
      now: () => "2026-08-19T22:00:00.000Z",
      createCredential: () => ({
        phrase,
        passwHash: "hashed-passw",
        nodeId: "org-node-1",
      }),
    });

    expect(result.organization).toEqual({
      organizationName: "Northwind Agents",
      email: "ops@northwind.test",
      website: "https://northwind.test",
      details: "Helpdesk and onboarding agents",
      nodeId: "org-node-1",
      createdAt: "2026-08-19T22:00:00.000Z",
    });
    expect(result.credentials).toEqual({
      serverUrl: "https://agent-play.com",
      nodeId: "org-node-1",
      passw: phrase,
    });
    expect(result.nextSteps.cliDocHref).toBe("/doc/cli");
    expect(result.nextSteps.initializeDocHref).toBe(
      "/doc/initialize-agent-server-and-template",
    );

    const stored = await redis.hgetall(
      organizationKey("default", "org-node-1"),
    );
    expect(stored.organizationName).toBe("Northwind Agents");
    expect(stored.nodeId).toBe("org-node-1");
    expect(JSON.stringify(stored)).not.toContain(phrase);
    expect(redis.sets.get(organizationsIndexKey("default"))?.has("org-node-1")).toBe(
      true,
    );
    expect(repository.nodes.get("org-node-1")?.kind).toBe("main");
    expect(repository.nodes.get("org-node-1")?.passwHash).toBe("hashed-passw");
  });

  it("lists registered organizations without exposing emails or passphrases", async () => {
    const repository = new FakeAgentRepository();
    const redis = new MemoryOrganizationRedis();
    const phrase =
      "alpha bravo charlie delta echo foxtrot golf hotel india juliet";

    await registerOrganization({
      repository,
      redis,
      hostId: "default",
      serverUrl: "https://agent-play.com",
      input: {
        organizationName: "Northwind Agents",
        email: "ops@northwind.test",
        website: "https://northwind.test",
        details: "Helpdesk and onboarding agents",
      },
      now: () => "2026-08-19T22:00:00.000Z",
      createCredential: () => ({
        phrase,
        passwHash: "hashed-passw",
        nodeId: "org-node-1",
      }),
    });
    await registerOrganization({
      repository,
      redis,
      hostId: "default",
      serverUrl: "https://agent-play.com",
      input: {
        organizationName: "Cedar Robotics",
        email: "hello@cedar.test",
      },
      now: () => "2026-08-20T09:00:00.000Z",
      createCredential: () => ({
        phrase,
        passwHash: "hashed-passw-2",
        nodeId: "org-node-2",
      }),
    });

    const listed = await listOrganizations({
      redis,
      hostId: "default",
    });

    expect(listed.map((organization) => organization.organizationName)).toEqual([
      "Cedar Robotics",
      "Northwind Agents",
    ]);
    expect(listed[1]).toEqual({
      nodeId: "org-node-1",
      organizationName: "Northwind Agents",
      website: "https://northwind.test",
      details: "Helpdesk and onboarding agents",
      createdAt: "2026-08-19T22:00:00.000Z",
    });
    expect(JSON.stringify(listed)).not.toContain("ops@northwind.test");
    expect(JSON.stringify(listed)).not.toContain(phrase);
  });
});
