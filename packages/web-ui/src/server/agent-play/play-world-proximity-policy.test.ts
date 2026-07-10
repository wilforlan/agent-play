import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";
import { GAME_CABINET_CATALOG } from "@agent-play/sdk";

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

  it("seeds arcade cabinets on start", async () => {
    const w = new PlayWorld({ sessionStore: new TestSessionStore() });
    await w.start();
    const snap = await w.getSnapshotJson();
    const cabinets = snap.worldMap.occupants.filter(
      (o) => o.kind === "structure" && o.gameId !== undefined
    );
    expect(cabinets.length).toBe(GAME_CABINET_CATALOG.length);
  });

  it("registerMCP is deprecated and returns empty id", async () => {
    const w = new PlayWorld({ sessionStore: new TestSessionStore() });
    await w.start();
    const before = (await w.getSnapshotJson()).worldMap.occupants.length;
    const id = await w.registerMCP({ name: "Legacy MCP" });
    expect(id).toBe("");
    const after = (await w.getSnapshotJson()).worldMap.occupants.length;
    expect(after).toBe(before);
  });
});
