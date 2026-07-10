import { describe, expect, it } from "vitest";
import { PlayWorld } from "./play-world.js";
import { TestSessionStore } from "./session-store.test-double.js";

describe("PlayWorld.updateLayoutBoundsField", () => {
  it("re-shapes zones to fit the new bounds and bumps the layout revision", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const before = w.getWorldLayout();
    const next = await w.updateLayoutBoundsField({
      field: "maxY",
      value: 9,
    });
    expect(next.bounds.maxY).toBe(9);
    expect(next.rev).toBe(before.rev + 1);
    for (const z of next.zones) {
      expect(z.rect.maxY).toBe(9);
    }
  });

  it("propagates the migrated layout into the persisted snapshot", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    await w.updateLayoutBoundsField({ field: "maxX", value: 11 });
    const snap = await w.getSnapshotJson();
    expect(snap.worldLayout.bounds.maxX).toBe(11);
    for (const z of snap.worldLayout.zones) {
      expect(z.rect.maxX).toBeLessThanOrEqual(11);
    }
  });

  it("preserves each occupant group's street identity across migration", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    const before = w.getWorldLayout();
    const beforeAgentStreet = before.zones.find(
      (z) => z.primaryGroup === "agent"
    );
    const beforeSpaceStreet = before.zones.find(
      (z) => z.primaryGroup === "space"
    );
    const beforeArcadeStreet = before.zones.find(
      (z) => z.primaryGroup === "arcade"
    );
    if (
      beforeAgentStreet === undefined ||
      beforeSpaceStreet === undefined ||
      beforeArcadeStreet === undefined
    ) {
      throw new Error("expected three primary zones");
    }
    const next = await w.updateLayoutBoundsField({ field: "maxX", value: 14 });
    expect(next.zones.find((z) => z.primaryGroup === "agent")?.streetId).toBe(
      beforeAgentStreet.streetId
    );
    expect(next.zones.find((z) => z.primaryGroup === "space")?.streetId).toBe(
      beforeSpaceStreet.streetId
    );
    expect(next.zones.find((z) => z.primaryGroup === "arcade")?.streetId).toBe(
      beforeArcadeStreet.streetId
    );
  });

  it("rejects field updates that would collapse the layout", async () => {
    const store = new TestSessionStore();
    const w = new PlayWorld({ sessionStore: store });
    await w.start();
    await expect(
      w.updateLayoutBoundsField({ field: "maxX", value: 1 })
    ).rejects.toThrow();
  });
});
