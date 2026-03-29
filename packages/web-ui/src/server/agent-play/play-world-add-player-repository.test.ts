import { describe, expect, it } from "vitest";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";
import { PlayWorld } from "./play-world.js";

describe("PlayWorld addPlayer with AgentRepository", () => {
  it("requires account apiKey when repository is configured", async () => {
    const repo = new InMemoryAgentRepository();
    await repo.createApiKey("u1");
    await repo.createAgent({
      name: "r",
      toolNames: ["chat_tool"],
      userId: "u1",
    });
    const w = new PlayWorld({ repository: repo });
    await w.start();

    await expect(
      w.addPlayer({
        name: "x",
        type: "langchain",
        agent: { type: "langchain", toolNames: ["chat_tool"] },
      })
    ).rejects.toThrow(/apiKey/);
  });

  it("matches registered agent by name and toolNames when agentId is omitted", async () => {
    const repo = new InMemoryAgentRepository();
    const { plainApiKey } = await repo.createApiKey("u1");
    const { agentId } = await repo.createAgent({
      name: "remote-demo",
      toolNames: ["chat_tool", "increment"],
      userId: "u1",
    });
    const w = new PlayWorld({ repository: repo });
    await w.start();

    const p = await w.addPlayer({
      name: "remote-demo",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["increment", "chat_tool"] },
      apiKey: plainApiKey,
    });
    expect(p.id).toBe(agentId);
  });

  it("creates a registered agent when agentId is omitted and no match exists", async () => {
    const repo = new InMemoryAgentRepository();
    const { plainApiKey } = await repo.createApiKey("u1");
    const w = new PlayWorld({ repository: repo });
    await w.start();

    const p = await w.addPlayer({
      name: "fresh",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      apiKey: plainApiKey,
    });
    const stored = await repo.getAgent(p.id);
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe("fresh");
    expect(stored?.toolNames).toEqual(["chat_tool"]);
  });

  it("rejects agentId that does not belong to the api key user", async () => {
    const repo = new InMemoryAgentRepository();
    const { plainApiKey } = await repo.createApiKey("u1");
    const { agentId: otherAgent } = await repo.createAgent({
      name: "other",
      toolNames: ["chat_tool"],
      userId: "u2",
    });

    const w = new PlayWorld({ repository: repo });
    await w.start();

    await expect(
      w.addPlayer({
        name: "x",
        type: "langchain",
        agent: { type: "langchain", toolNames: ["chat_tool"] },
        apiKey: plainApiKey,
        agentId: otherAgent,
      })
    ).rejects.toThrow(/belong/);
  });

  it("accepts explicit agentId when it belongs to the user", async () => {
    const repo = new InMemoryAgentRepository();
    const { plainApiKey } = await repo.createApiKey("u1");
    const { agentId } = await repo.createAgent({
      name: "r",
      toolNames: ["chat_tool"],
      userId: "u1",
    });
    const w = new PlayWorld({ repository: repo });
    await w.start();

    const p = await w.addPlayer({
      name: "ok",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      apiKey: plainApiKey,
      agentId,
    });
    expect(p.id).toBe(agentId);
  });

  it("uses ephemeral player id when repository is not configured", async () => {
    const w = new PlayWorld();
    await w.start();
    const p = await w.addPlayer({
      name: "x",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
    });
    expect(p.id.length).toBeGreaterThan(0);
  });
});
