import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";

describe("PlayWorld proximity policy", () => {
  it("blocks human to human proximity communication", async () => {
    const w = new PlayWorld();
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
    const w = new PlayWorld();
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
});

