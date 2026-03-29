import { describe, expect, it } from "vitest";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";

describe("InMemoryAgentRepository", () => {
  it("enforces max agents per account", async () => {
    const repo = new InMemoryAgentRepository();
    await repo.createApiKey("u1");
    await repo.createAgent({
      name: "a",
      toolNames: ["chat_tool"],
      userId: "u1",
    });
    await repo.createAgent({
      name: "b",
      toolNames: ["chat_tool"],
      userId: "u1",
    });
    await expect(
      repo.createAgent({
        name: "c",
        toolNames: ["chat_tool"],
        userId: "u1",
      })
    ).rejects.toThrow(/limit/);
  });

  it("allows only one account api key", async () => {
    const repo = new InMemoryAgentRepository();
    await repo.createApiKey("u1");
    await expect(repo.createApiKey("u1")).rejects.toThrow(/already exists/);
  });
});
