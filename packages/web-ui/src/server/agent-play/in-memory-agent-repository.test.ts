import { describe, expect, it } from "vitest";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";

const TEST_ROOT_KEY = "fixture-root-key";

describe("InMemoryAgentRepository", () => {
  it("enforces max agents per node", async () => {
    const repo = new InMemoryAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode("amber angle apple");
    await repo.createAgent({
      name: "a",
      toolNames: ["chat_tool"],
      nodeId,
    });
    await repo.createAgent({
      name: "b",
      toolNames: ["chat_tool"],
      nodeId,
    });
    await expect(
      repo.createAgent({
        name: "c",
        toolNames: ["chat_tool"],
        nodeId,
      })
    ).rejects.toThrow(/limit/);
  });

  it("verifies node passw", async () => {
    const repo = new InMemoryAgentRepository({ rootKey: TEST_ROOT_KEY });
    const { nodeId } = await repo.createNode("amber angle apple");
    await expect(repo.verifyNodePassw(nodeId, "amber angle apple")).resolves.toBe(
      true
    );
    await expect(repo.verifyNodePassw(nodeId, "wrong phrase")).resolves.toBe(
      false
    );
  });
});
