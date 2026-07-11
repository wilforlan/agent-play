import { describe, expect, it } from "vitest";
import { occupancyKeyForPosition } from "@agent-play/sdk";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

describe("PlayWorld addPlayer placement", () => {
  it("assigns distinct agent strip cells for two sequential registrations", async () => {
    const store = new TestSessionStore();
    const world = new PlayWorld({ sessionStore: store });
    await world.start();

    await world.addPlayer({
      name: "First",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "placement-agent-a",
    });
    await world.addPlayer({
      name: "Second",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "placement-agent-b",
    });

    const snap = await world.getSnapshotJson();
    const agents = snap.worldMap.occupants.filter((o) => o.kind === "agent");
    expect(agents).toHaveLength(2);
    const a = agents.find((o) => o.agentId === "placement-agent-a");
    const b = agents.find((o) => o.agentId === "placement-agent-b");
    expect(a?.kind).toBe("agent");
    expect(b?.kind).toBe("agent");
    if (a?.kind !== "agent" || b?.kind !== "agent") {
      return;
    }
    expect(
      occupancyKeyForPosition(a.x, a.y) === occupancyKeyForPosition(b.x, b.y)
    ).toBe(false);
  });
});
