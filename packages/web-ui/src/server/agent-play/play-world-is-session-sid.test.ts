import { describe, expect, it } from "vitest";
import type { AgentRepository } from "./agent-repository.js";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

function stubRepo(partial: Partial<AgentRepository>): AgentRepository {
  return {
    getGenesisNodeId: () => "root",
    validateNodeIdentity: async () => ({ ok: false }),
    findAccountIdForAgentNode: async () => null,
    createNode: async () => {
      throw new Error("unimplemented");
    },
    verifyNodePassw: async () => false,
    getNode: async () => null,
    deleteMainNodeCascade: async () => ({ deletedAgentCount: 0 }),
    createAgentNode: async () => {
      throw new Error("unimplemented");
    },
    getAgent: async () => null,
    listAgentsForNode: async () => [],
    deleteAgent: async () => false,
    incrementZoneCount: async () => null,
    incrementYieldCount: async () => null,
    ...partial,
  };
}

describe("PlayWorld isSessionSid", () => {
  it("accepts the canonical world session id", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    expect(await w.isSessionSid(store.getSessionId())).toBe(true);
  });

  it("accepts a registered agent node id as session id", async () => {
    const store = new TestSessionStore();
    const repository = stubRepo({
      getNode: async (id: string) =>
        id === "agent-xyz"
          ? {
              nodeId: "agent-xyz",
              kind: "agent",
              createdAt: "2020-01-01T00:00:00.000Z",
            }
          : null,
    });
    const w = new PlayWorld({ sessionStore: store, repository });
    await w.start();
    expect(await w.isSessionSid("agent-xyz")).toBe(true);
    expect(await w.isSessionSid("not-an-agent")).toBe(false);
  });

  it("rejects main node id as session id", async () => {
    const store = new TestSessionStore();
    const repository = stubRepo({
      getNode: async (id: string) =>
        id === "main-1"
          ? {
              nodeId: "main-1",
              kind: "main",
              createdAt: "2020-01-01T00:00:00.000Z",
            }
          : null,
    });
    const w = new PlayWorld({ sessionStore: store, repository });
    await w.start();
    expect(await w.isSessionSid("main-1")).toBe(false);
  });
});
