import { describe, expect, it } from "vitest";
import {
  COLUMN_STREET_ROW_HEIGHT,
  DEFAULT_LAYOUT_BOUNDS_WITH_PARKING,
  MINIMUM_STREET_LAYOUT_BOUNDS,
  PARKING_COLUMN_GAP_ROWS,
  PARKING_STREET_ROW_HEIGHT,
} from "./world-bounds.js";
import { STREET_NAME_POOL } from "./world-streets-pool.js";
import {
  applyBoundsFieldUpdateToLayout,
  availableCellsForZone,
  buildRankedOccupancyPointsForZone,
  cellsForZone,
  centerOfZone,
  createVerticalStripSeedLayout,
  createWorldLayoutWithParkingRow,
  layoutHasParkingZone,
  layoutNeedsParkingColumnGapMigration,
  migrateLayoutToParkingColumnGap,
  migrateLayoutToParkingRow,
  migrateWorldLayoutBounds,
  nextStreetFromPool,
  pickZoneForGroup,
  pointCellInZone,
  primaryZoneForGroup,
  type WorldLayout,
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
    bounds: MINIMUM_STREET_LAYOUT_BOUNDS,
    streets: threeSeedStreets(),
  });

const fourSeedStreets = (): [
  (typeof STREET_NAME_POOL)[number],
  (typeof STREET_NAME_POOL)[number],
  (typeof STREET_NAME_POOL)[number],
  (typeof STREET_NAME_POOL)[number],
] => {
  const a = STREET_NAME_POOL[0];
  const b = STREET_NAME_POOL[1];
  const c = STREET_NAME_POOL[2];
  const d = STREET_NAME_POOL[3];
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    throw new Error("STREET_NAME_POOL must have at least four entries");
  }
  return [a, b, c, d];
};

const getParkingSeedLayout = () =>
  createWorldLayoutWithParkingRow({
    bounds: DEFAULT_LAYOUT_BOUNDS_WITH_PARKING,
    streets: fourSeedStreets(),
  });

describe("createWorldLayoutWithParkingRow", () => {
  it("places column streets on Y 0–2, gap on Y 3, parking strip on Y 4–7 spanning full X", () => {
    const layout = getParkingSeedLayout();
    expect(layout.zones.length).toBe(4);
    const agent = pickZoneForGroup(layout, "agent");
    const parking = pickZoneForGroup(layout, "parking");
    expect(agent.rect.minY).toBe(0);
    expect(agent.rect.maxY).toBe(COLUMN_STREET_ROW_HEIGHT - 1);
    expect(parking.id).toBe("zone-parking-strip");
    expect(parking.rect.minY).toBe(
      COLUMN_STREET_ROW_HEIGHT + PARKING_COLUMN_GAP_ROWS
    );
    expect(parking.rect.maxY).toBe(
      COLUMN_STREET_ROW_HEIGHT +
        PARKING_COLUMN_GAP_ROWS +
        PARKING_STREET_ROW_HEIGHT -
        1
    );
    expect(parking.rect.minX).toBe(DEFAULT_LAYOUT_BOUNDS_WITH_PARKING.minX);
    expect(parking.rect.maxX).toBe(DEFAULT_LAYOUT_BOUNDS_WITH_PARKING.maxX);
    expect(parking.streetId).toBe(STREET_NAME_POOL[3]?.id);
  });

  it("migrates legacy three-zone layout to include parking row", () => {
    const legacy = getMinimumSeedLayout();
    expect(layoutHasParkingZone(legacy)).toBe(false);
    const migrated = migrateLayoutToParkingRow(legacy);
    expect(layoutHasParkingZone(migrated)).toBe(true);
    expect(pickZoneForGroup(migrated, "agent").streetId).toBe(
      pickZoneForGroup(legacy, "agent").streetId
    );
    expect(pickZoneForGroup(migrated, "parking").rect.minY).toBe(4);
  });

  it("re-migrates parking row without column gap to Y 4–7", () => {
    const current = getParkingSeedLayout();
    const agent = pickZoneForGroup(current, "agent");
    const withoutGap: WorldLayout = {
      ...current,
      rev: 5,
      bounds: { ...current.bounds, maxY: 6 },
      zones: current.zones.map((zone) => {
        if (zone.primaryGroup !== "parking") {
          return zone;
        }
        return {
          ...zone,
          rect: {
            ...zone.rect,
            minY: agent.rect.maxY + 1,
            maxY: agent.rect.maxY + PARKING_STREET_ROW_HEIGHT,
          },
        };
      }),
    };
    expect(layoutNeedsParkingColumnGapMigration(withoutGap)).toBe(true);
    const migrated = migrateLayoutToParkingColumnGap(withoutGap);
    expect(layoutNeedsParkingColumnGapMigration(migrated)).toBe(false);
    expect(pickZoneForGroup(migrated, "parking").rect.minY).toBe(4);
    expect(pickZoneForGroup(migrated, "parking").rect.maxY).toBe(7);
    expect(migrated.bounds.maxY).toBe(7);
    expect(migrated.rev).toBe(6);
    expect(pickZoneForGroup(migrated, "agent").streetId).toBe(
      pickZoneForGroup(withoutGap, "agent").streetId
    );
  });

  it("migrates legacy mcp primaryGroup layout to include parking row", () => {
    const base = getMinimumSeedLayout();
    const legacyMcp: WorldLayout = {
      ...base,
      zones: base.zones.map((zone) => {
        if (zone.primaryGroup !== "arcade") {
          return zone;
        }
        return {
          ...zone,
          id: "zone-mcp-strip",
          primaryGroup: "mcp" as "arcade",
          allowedGroups: ["mcp" as "arcade"],
        };
      }),
    };
    const migrated = migrateLayoutToParkingRow(legacyMcp);
    expect(layoutHasParkingZone(migrated)).toBe(true);
    expect(primaryZoneForGroup(migrated, "arcade")?.id).toBe("zone-arcade-strip");
    expect(pickZoneForGroup(migrated, "agent").streetId).toBe(
      pickZoneForGroup(base, "agent").streetId
    );
  });
});

describe("world-layout-model", () => {
  it("enumerates zone cells with count matching rectangle area", () => {
    const layout = getMinimumSeedLayout();
    const agent = pickZoneForGroup(layout, "agent");
    const w = agent.rect.maxX - agent.rect.minX + 1;
    const h = agent.rect.maxY - agent.rect.minY + 1;
    expect(cellsForZone(agent).length).toBe(w * h);
  });

  it("partitions street layout bounds into vertical strips seven seven six", () => {
    const layout = getMinimumSeedLayout();
    const [a, s, m] = layout.zones;
    if (a === undefined || s === undefined || m === undefined) {
      throw new Error("expected three zones");
    }
    expect(a.rect.maxX - a.rect.minX + 1).toBe(7);
    expect(s.rect.maxX - s.rect.minX + 1).toBe(7);
    expect(m.rect.maxX - m.rect.minX + 1).toBe(6);
    expect(a.rect.minY).toBe(MINIMUM_STREET_LAYOUT_BOUNDS.minY);
    expect(a.rect.maxY).toBe(MINIMUM_STREET_LAYOUT_BOUNDS.maxY);
    const cellKeys = new Set<string>();
    for (const z of layout.zones) {
      for (const c of cellsForZone(z)) {
        const k = `${String(c.x)},${String(c.y)}`;
        expect(cellKeys.has(k)).toBe(false);
        cellKeys.add(k);
      }
    }
    expect(cellKeys.size).toBe(60);
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
    expect(primaryZoneForGroup(layout, "arcade")?.primaryGroup).toBe("arcade");
    expect(zonesForGroup(layout, "agent").length).toBe(1);
  });

  it("assigns arcade zone on Maple Ave with zone-arcade-strip id", () => {
    const layout = getMinimumSeedLayout();
    const arcade = pickZoneForGroup(layout, "arcade");
    expect(arcade.id).toBe("zone-arcade-strip");
    expect(arcade.streetId).toBe("maple");
    expect(arcade.streetLabel).toBe("Maple Ave.");
  });

  it("classifies floor cells into zones", () => {
    const layout = getMinimumSeedLayout();
    const agent = pickZoneForGroup(layout, "agent");
    const arcade = pickZoneForGroup(layout, "arcade");
    expect(pointCellInZone(3.5, 1.5, agent)).toBe(true);
    expect(pointCellInZone(10.5, 1.5, agent)).toBe(false);
    expect(pointCellInZone(16.5, 1.5, arcade)).toBe(true);
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
    const arcadeStreet = pickZoneForGroup(layout, "arcade");
    const next = migrateWorldLayoutBounds({
      layout,
      bounds: { minX: 0, minY: 0, maxX: 11, maxY: 9 },
    });
    expect(next.bounds).toEqual({ minX: 0, minY: 0, maxX: 11, maxY: 9 });
    expect(next.rev).toBe(layout.rev + 1);
    expect(pickZoneForGroup(next, "agent").streetId).toBe(agentStreet.streetId);
    expect(pickZoneForGroup(next, "space").streetId).toBe(spaceStreet.streetId);
    expect(pickZoneForGroup(next, "arcade").streetId).toBe(arcadeStreet.streetId);
    expect(pickZoneForGroup(next, "agent").rect.maxY).toBe(9);
    expect(pickZoneForGroup(next, "arcade").rect.maxX).toBe(11);
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
