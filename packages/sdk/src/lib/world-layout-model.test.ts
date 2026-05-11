import { describe, expect, it } from "vitest";
import { MINIMUM_PLAY_WORLD_BOUNDS } from "./world-bounds.js";
import { STREET_NAME_POOL } from "./world-streets-pool.js";
import {
  applyBoundsFieldUpdateToLayout,
  availableCellsForZone,
  buildRankedOccupancyPointsForZone,
  cellsForZone,
  centerOfZone,
  createVerticalStripSeedLayout,
  migrateWorldLayoutBounds,
  nextStreetFromPool,
  pickZoneForGroup,
  pointCellInZone,
  primaryZoneForGroup,
  zonesForGroup,
} from "./world-layout-model.js";

const threeSeedStreets = (): [
  (typeof STREET_NAME_POOL)[number],
  (typeof STREET_NAME_POOL)[number],
  (typeof STREET_NAME_POOL)[number],
] => {
  const a = STREET_NAME_POOL[0];
  const b = STREET_NAME_POOL[1];
  const c = STREET_NAME_POOL[2];
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error("STREET_NAME_POOL must have at least three entries");
  }
  return [a, b, c];
};

const getMinimumSeedLayout = () =>
  createVerticalStripSeedLayout({
    bounds: MINIMUM_PLAY_WORLD_BOUNDS,
    streets: threeSeedStreets(),
  });

describe("world-layout-model", () => {
  it("enumerates zone cells with count matching rectangle area", () => {
    const layout = getMinimumSeedLayout();
    const agent = pickZoneForGroup(layout, "agent");
    const w = agent.rect.maxX - agent.rect.minX + 1;
    const h = agent.rect.maxY - agent.rect.minY + 1;
    expect(cellsForZone(agent).length).toBe(w * h);
  });

  it("partitions minimum play bounds into vertical strips seven seven six", () => {
    const layout = getMinimumSeedLayout();
    const [a, s, m] = layout.zones;
    if (a === undefined || s === undefined || m === undefined) {
      throw new Error("expected three zones");
    }
    expect(a.rect.maxX - a.rect.minX + 1).toBe(7);
    expect(s.rect.maxX - s.rect.minX + 1).toBe(7);
    expect(m.rect.maxX - m.rect.minX + 1).toBe(6);
    expect(a.rect.minY).toBe(MINIMUM_PLAY_WORLD_BOUNDS.minY);
    expect(a.rect.maxY).toBe(MINIMUM_PLAY_WORLD_BOUNDS.maxY);
    const cellKeys = new Set<string>();
    for (const z of layout.zones) {
      for (const c of cellsForZone(z)) {
        const k = `${String(c.x)},${String(c.y)}`;
        expect(cellKeys.has(k)).toBe(false);
        cellKeys.add(k);
      }
    }
    expect(cellKeys.size).toBe(400);
  });

  it("ranks occupancy points from zone center outward", () => {
    const layout = getMinimumSeedLayout();
    const zone = pickZoneForGroup(layout, "space");
    const ranked = buildRankedOccupancyPointsForZone(zone);
    const ctr = centerOfZone(zone);
    expect(ranked.length).toBe(cellsForZone(zone).length * 25);
    const first = ranked[0];
    if (first === undefined) {
      throw new Error("expected point");
    }
    expect(
      Math.hypot(first.x - ctr.x, first.y - ctr.y)
    ).toBeLessThanOrEqual(0.55);
    for (let i = 1; i < ranked.length; i += 1) {
      const prev = ranked[i - 1];
      const cur = ranked[i];
      if (prev === undefined || cur === undefined) {
        throw new Error("ranked");
      }
      const dPrev = Math.hypot(prev.x - ctr.x, prev.y - ctr.y);
      const dCur = Math.hypot(cur.x - ctr.x, cur.y - ctr.y);
      expect(dCur >= dPrev).toBe(true);
    }
  });

  it("resolves primary zones per occupant group", () => {
    const layout = getMinimumSeedLayout();
    expect(primaryZoneForGroup(layout, "agent")?.primaryGroup).toBe("agent");
    expect(primaryZoneForGroup(layout, "space")?.primaryGroup).toBe("space");
    expect(primaryZoneForGroup(layout, "mcp")?.primaryGroup).toBe("mcp");
    expect(zonesForGroup(layout, "agent").length).toBe(1);
  });

  it("classifies floor cells into zones", () => {
    const layout = getMinimumSeedLayout();
    const agent = pickZoneForGroup(layout, "agent");
    const mcp = pickZoneForGroup(layout, "mcp");
    expect(pointCellInZone(3.5, 10.5, agent)).toBe(true);
    expect(pointCellInZone(16.5, 10.5, agent)).toBe(false);
    expect(pointCellInZone(16.5, 10.5, mcp)).toBe(true);
  });

  it("returns next unused street from the canonical pool", () => {
    expect(nextStreetFromPool(new Set())?.id).toBe(STREET_NAME_POOL[0]?.id);
    const all = new Set(STREET_NAME_POOL.map((s) => s.id));
    expect(nextStreetFromPool(all)).toBeUndefined();
  });

  it("exposes unique street ids on seeded layout", () => {
    const layout = getMinimumSeedLayout();
    const ids = new Set(layout.streets.map((s) => s.id));
    expect(ids.size).toBe(layout.streets.length);
  });

  it("filters available cells by occupied keys", () => {
    const layout = getMinimumSeedLayout();
    const zone = pickZoneForGroup(layout, "agent");
    const free = availableCellsForZone(zone, new Set(["0,0"]));
    expect(free.some((c) => c.x === 0 && c.y === 0)).toBe(false);
    expect(free.length).toBe(cellsForZone(zone).length - 1);
  });

  it("throws when no primary zone exists for group", () => {
    const layout = getMinimumSeedLayout();
    const emptyZones = { ...layout, zones: [] as const };
    expect(() => pickZoneForGroup(emptyZones, "agent")).toThrow();
  });

  it("migrates bounds preserving each group's street identity", () => {
    const layout = getMinimumSeedLayout();
    const agentStreet = pickZoneForGroup(layout, "agent");
    const spaceStreet = pickZoneForGroup(layout, "space");
    const mcpStreet = pickZoneForGroup(layout, "mcp");
    const next = migrateWorldLayoutBounds({
      layout,
      bounds: { minX: 0, minY: 0, maxX: 11, maxY: 9 },
    });
    expect(next.bounds).toEqual({ minX: 0, minY: 0, maxX: 11, maxY: 9 });
    expect(next.rev).toBe(layout.rev + 1);
    expect(pickZoneForGroup(next, "agent").streetId).toBe(agentStreet.streetId);
    expect(pickZoneForGroup(next, "space").streetId).toBe(spaceStreet.streetId);
    expect(pickZoneForGroup(next, "mcp").streetId).toBe(mcpStreet.streetId);
    expect(pickZoneForGroup(next, "agent").rect.maxY).toBe(9);
    expect(pickZoneForGroup(next, "mcp").rect.maxX).toBe(11);
  });

  it("partitions migrated zones to exactly cover the new bounds", () => {
    const layout = getMinimumSeedLayout();
    const next = migrateWorldLayoutBounds({
      layout,
      bounds: { minX: 0, minY: 0, maxX: 14, maxY: 14 },
    });
    const seen = new Set<string>();
    for (const z of next.zones) {
      for (const c of cellsForZone(z)) {
        const key = `${String(c.x)},${String(c.y)}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(15 * 15);
  });

  it("rejects migrations that produce a sub-three-wide span", () => {
    const layout = getMinimumSeedLayout();
    expect(() =>
      migrateWorldLayoutBounds({
        layout,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 9 },
      })
    ).toThrow();
  });

  it("rejects migrations that invert an axis", () => {
    const layout = getMinimumSeedLayout();
    expect(() =>
      migrateWorldLayoutBounds({
        layout,
        bounds: { minX: 5, minY: 0, maxX: 3, maxY: 9 },
      })
    ).toThrow();
  });

  it("applies a single bounds field update", () => {
    const layout = getMinimumSeedLayout();
    const next = applyBoundsFieldUpdateToLayout({
      layout,
      field: "maxY",
      value: 9,
    });
    expect(next.bounds).toEqual({ ...layout.bounds, maxY: 9 });
    expect(pickZoneForGroup(next, "agent").rect.maxY).toBe(9);
    expect(pickZoneForGroup(next, "space").rect.maxY).toBe(9);
  });

  it("rejects non-integer bounds values", () => {
    const layout = getMinimumSeedLayout();
    expect(() =>
      applyBoundsFieldUpdateToLayout({
        layout,
        field: "maxX",
        value: 12.5,
      })
    ).toThrow();
  });
});
