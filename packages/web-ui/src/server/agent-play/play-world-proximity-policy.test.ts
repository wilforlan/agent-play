import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

describe("PlayWorld proximity policy", () => {
  it("blocks human to human proximity communication", async () => {
    const w = new PlayWorld({ sessionStore: new TestSessionStore() });
    await w.start();
    await expect(
      w.recordProximityAction({
        fromPlayerId: "__human__",
        toPlayerId: "human:__human__",
        action: "chat",
      })
    ).rejects.toThrow(/human to human is not allowed/);
  });

  it("allows human to mcp chat and emits world interaction fanout", async () => {
    const w = new PlayWorld({ sessionStore: new TestSessionStore() });
    await w.start();
    const mcpId = await w.registerMCP({ name: "Docs MCP", url: "https://mcp.example" });
    await expect(
      w.recordProximityAction({
        fromPlayerId: "__human__",
        toPlayerId: `mcp:${mcpId}`,
        action: "chat",
      })
    ).resolves.toBeUndefined();
  });

  it("accepts bare main node id as human fromPlayerId", async () => {
    const genesis = "main-node-test-abc";
    const store = new TestSessionStore({ playerChainGenesis: genesis });
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const mcpId = await w.registerMCP({ name: "Docs MCP", url: "https://mcp.example" });
    await expect(
      w.recordProximityAction({
        fromPlayerId: genesis,
        toPlayerId: `mcp:${mcpId}`,
        action: "chat",
      })
    ).resolves.toBeUndefined();
  });

  it("accepts onboarded snapshot mainNodeId when it differs from player-chain genesis", async () => {
    const genesis = "short-genesis-id";
    const onboardedMain =
      "75c4aeb12681a2526c0e4cacbe8c7d45afeab99d2d09d07d68ed8b8e5b6d3dc3";
    const store = new TestSessionStore({ playerChainGenesis: genesis });
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const prev = await store.getSnapshotJson();
    if (prev === null) {
      throw new Error("expected snapshot after start");
    }
    await store.persistSnapshot({
      ...prev,
      mainNodeId: onboardedMain,
    });
    const mcpId = await w.registerMCP({ name: "Docs MCP", url: "https://mcp.example" });
    await expect(
      w.recordProximityAction({
        fromPlayerId: onboardedMain,
        toPlayerId: `mcp:${mcpId}`,
        action: "chat",
      })
    ).resolves.toBeUndefined();
  });
});

