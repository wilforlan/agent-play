import { describe, expect, it } from "vitest";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";

describe("InMemoryAgentRepository", () => {
  it("creates agent and verifies api key", async () => {
    const r = new InMemoryAgentRepository();
    const { agentId, plainApiKey } = await r.createAgent({
      name: "a1",
      toolNames: ["chat_tool", "assist_x"],
    });
    expect(agentId.length).toBeGreaterThan(0);
    expect(plainApiKey.length).toBeGreaterThan(0);
    expect(await r.verifyApiKeyAndGetAgentId("wrong")).toBe(null);
    expect(await r.verifyApiKeyAndGetAgentId(plainApiKey)).toBe(agentId);
  });

  it("increments zone and flags at threshold", async () => {
    const r = new InMemoryAgentRepository();
    const { agentId, plainApiKey } = await r.createAgent({
      name: "z",
      toolNames: ["chat_tool"],
    });
    expect(await r.verifyApiKeyAndGetAgentId(plainApiKey)).toBe(agentId);
    for (let i = 0; i < 99; i += 1) {
      await r.incrementZoneCount(agentId);
    }
    if ((await r.getAgent(agentId))?.flagged !== false) {
      throw new Error("unexpected flag before");
    }
    await r.incrementZoneCount(agentId);
    expect((await r.getAgent(agentId))?.flagged).toBe(true);
  });
});
