import { describe, expect, it } from "vitest";
import { pointCellInZone, primaryZoneForGroup } from "@agent-play/sdk";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

describe("PlayWorld space placement uses the worldLayout space zone", () => {
  it("registers a structure without explicit x,y by anchoring it inside the space zone", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const space = await w.registerSpaceNode({
      name: "Grocery",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    const structure = await w.registerStructureNode({
      name: "Supermarket",
      spaceIds: [space.id],
    });
    const layout = w.getWorldLayout();
    const spaceZone = primaryZoneForGroup(layout, "space");
    if (spaceZone === undefined) {
      throw new Error("expected space zone in default layout");
    }
    expect(pointCellInZone(structure.x, structure.y, spaceZone)).toBe(true);
  });

  it("places multiple auto-anchored structures at distinct cells in the space zone", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const sA = await w.registerSpaceNode({
      name: "A",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    const sB = await w.registerSpaceNode({
      name: "B",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    const a = await w.registerStructureNode({
      name: "Anchor A",
      spaceIds: [sA.id],
    });
    const b = await w.registerStructureNode({
      name: "Anchor B",
      spaceIds: [sB.id],
    });
    const layout = w.getWorldLayout();
    const spaceZone = primaryZoneForGroup(layout, "space");
    if (spaceZone === undefined) {
      throw new Error("expected space zone in default layout");
    }
    expect(pointCellInZone(a.x, a.y, spaceZone)).toBe(true);
    expect(pointCellInZone(b.x, b.y, spaceZone)).toBe(true);
    expect(`${String(a.x)},${String(a.y)}`).not.toBe(
      `${String(b.x)},${String(b.y)}`
    );
  });

  it("ignores caller-provided coordinates outside the space zone and re-anchors inside it", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const space = await w.registerSpaceNode({
      name: "Grocery",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    const structure = await w.registerStructureNode({
      name: "Supermarket",
      x: 0,
      y: 0,
      spaceIds: [space.id],
    });
    const layout = w.getWorldLayout();
    const spaceZone = primaryZoneForGroup(layout, "space");
    if (spaceZone === undefined) {
      throw new Error("expected space zone in default layout");
    }
    expect(pointCellInZone(structure.x, structure.y, spaceZone)).toBe(true);
  });

  it("keeps every structure position unique after the space zone shrinks", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const ids = ["s1", "s2", "s3", "s4"];
    for (const id of ids) {
      const space = await w.registerSpaceNode({
        id: `space-${id}`,
        name: `Space ${id}`,
        designKey: "supermarket-v1",
        amenities: ["supermarket"],
      });
      await w.registerStructureNode({
        id,
        name: id,
        spaceIds: [space.id],
      });
    }
    await w.updateLayoutBoundsField({ field: "maxX", value: 5 });
    await w.updateLayoutBoundsField({ field: "maxY", value: 4 });
    const snap = await w.getSnapshotJson();
    const structures = snap.worldMap.occupants.filter(
      (o) => o.kind === "structure"
    );
    expect(structures.length).toBe(ids.length);
    const keys = structures.map((s) => `${String(s.x)},${String(s.y)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("re-anchors existing structures after the layout space zone migrates", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const space = await w.registerSpaceNode({
      name: "Grocery",
      designKey: "supermarket-v1",
      amenities: ["supermarket"],
    });
    const structure = await w.registerStructureNode({
      name: "Supermarket",
      spaceIds: [space.id],
    });
    await w.updateLayoutBoundsField({ field: "maxX", value: 5 });
    const snap = await w.getSnapshotJson();
    const layout = w.getWorldLayout();
    const spaceZone = primaryZoneForGroup(layout, "space");
    if (spaceZone === undefined) {
      throw new Error("expected space zone after migration");
    }
    const occ = snap.worldMap.occupants.find(
      (o) => o.kind === "structure" && o.id === structure.id
    );
    if (occ === undefined || occ.kind !== "structure") {
      throw new Error("expected structure occupant");
    }
    expect(pointCellInZone(occ.x, occ.y, spaceZone)).toBe(true);
  });
});
