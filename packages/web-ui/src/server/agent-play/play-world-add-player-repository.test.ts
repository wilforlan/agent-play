import { describe, expect, it } from "vitest";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";
import { PlayWorld } from "./play-world.js";

describe("PlayWorld addPlayer with AgentRepository", () => {
  const TEST_ROOT_KEY = "fixture-root-key";
  const PASSW = "amber angle apple";

  it("requires account password when repository is configured", async () => {
    const repo = new InMemoryAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode(PASSW);
    await repo.createAgent({
      name: "r",
      toolNames: ["chat_tool"],
      nodeId,
    });
    const w = new PlayWorld({ repository: repo });
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
    const repo = new InMemoryAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode(PASSW);
    const { agentId } = await repo.createAgent({
      name: "remote-demo",
      toolNames: ["chat_tool", "increment"],
      nodeId,
    });
    const w = new PlayWorld({ repository: repo });
    await w.start();

    const p = await w.addPlayer({
      name: "remote-demo",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["increment", "chat_tool"] },
      mainNodeId: nodeId,
      password: PASSW,
      agentId,
    });
    expect(p.id).toBe(agentId);
  });

  it("accepts an existing repository row and session player id matches agentId", async () => {
    const repo = new InMemoryAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode(PASSW);
    const { agentId } = await repo.createAgent({
      name: "fresh",
      toolNames: ["chat_tool"],
      nodeId,
    });
    const w = new PlayWorld({ repository: repo });
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
    const repo = new InMemoryAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId: nodeA } = await repo.createNode(PASSW);
    const { nodeId: nodeB } = await repo.createNode("orchid pearl river");
    const { agentId: otherAgent } = await repo.createAgent({
      name: "other",
      toolNames: ["chat_tool"],
      nodeId: nodeB,
    });

    const w = new PlayWorld({ repository: repo });
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
    const repo = new InMemoryAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode(PASSW);
    const { agentId } = await repo.createAgent({
      name: "r",
      toolNames: ["chat_tool"],
      nodeId,
    });
    const w = new PlayWorld({ repository: repo });
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
    const w = new PlayWorld();
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
