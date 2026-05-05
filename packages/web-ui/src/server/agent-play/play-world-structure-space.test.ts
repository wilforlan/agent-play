import { describe, expect, it } from "vitest";
import { TestSessionStore } from "./session-store.test-double.js";
import { PlayWorld } from "./play-world.js";
import { WORLD_SPACE_TRANSITION_EVENT } from "./play-transport.js";

describe("PlayWorld structure to space transitions", () => {
  it("enters the default space attached to a structure", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    await w.addPlayer({
      name: "shopper",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "shopper-agent",
    });
    const grocery = await w.registerSpaceNode({
      name: "Grocery Interior",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    const structure = await w.registerStructureNode({
      name: "Supermarket",
      x: 12,
      y: 20,
      spaceIds: [grocery.id],
    });

    let receivedSpaceId: string | null = null;
    w.on(WORLD_SPACE_TRANSITION_EVENT, (payload) => {
      const transition = payload as { to: { spaceId?: string } };
      receivedSpaceId = transition.to.spaceId ?? null;
    });

    const transition = await w.enterStructureSpace({
      playerId: "shopper-agent",
      structureId: structure.id,
    });

    expect(transition.to.spaceId).toBe(grocery.id);
    expect(receivedSpaceId).toBe(grocery.id);

    const snap = await w.getSnapshotJson();
    expect(snap.spaces?.some((s) => s.id === grocery.id)).toBe(true);
    expect(
      snap.worldMap.occupants.some(
        (o) => o.kind === "structure" && o.id === structure.id
      )
    ).toBe(true);
  });

  it("supports selecting one of multiple attached spaces", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    await w.addPlayer({
      name: "shopper",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["chat_tool"] },
      agentId: "shopper-agent-2",
    });
    const grocery = await w.registerSpaceNode({
      name: "Grocery Interior",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    const pharmacy = await w.registerSpaceNode({
      name: "Pharmacy Annex",
      designKey: "pharmacy-v1",
      amenities: ["shop"],
    });
    const structure = await w.registerStructureNode({
      name: "Supermarket",
      x: 5,
      y: 7,
      spaceIds: [grocery.id, pharmacy.id],
    });

    const transition = await w.enterStructureSpace({
      playerId: "shopper-agent-2",
      structureId: structure.id,
      spaceId: pharmacy.id,
    });

    expect(transition.to.spaceId).toBe(pharmacy.id);
    expect(transition.to.structureId).toBe(structure.id);
  });
});
