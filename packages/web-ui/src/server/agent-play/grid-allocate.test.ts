import { describe, expect, it } from "vitest";
import {
  listOccupancyPointsForZone,
  pickZoneForGroup,
  pointCellInZone,
} from "@agent-play/sdk";
import { createDefaultSeededPlayLayout } from "./world-layout-bootstrap.js";
import {
  computeFreeMapCell,
  computeRandomFreeMapCell,
  computeRandomFreeMapCellInSpatialZone,
  computeSpaceStructureAnchor,
  SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE,
} from "./grid-allocate.js";

const occupancyKey = (x: number, y: number): string =>
  `${(Math.round(x * 5) / 5).toFixed(3)},${(Math.round(y * 5) / 5).toFixed(3)}`;

const testLayout = (): ReturnType<typeof createDefaultSeededPlayLayout> =>
  createDefaultSeededPlayLayout();

const addOccupiedCell = (
  occupied: Set<string>,
  options: { cellX: number; cellY: number }
): void => {
  const { cellX, cellY } = options;
  for (let dx = 0; dx < 5; dx += 1) {
    for (let dy = 0; dy < 5; dy += 1) {
      const x = cellX + 0.2 + (dx + 0.5) / 5;
      const y = cellY + 0.2 + (dy + 0.5) / 5;
      occupied.add(occupancyKey(x, y));
    }
  }
};

describe("computeRandomFreeMapCell", () => {
  it("selects inside the agent primary zone from world layout", () => {
    const layout = testLayout();
    const zone = pickZoneForGroup(layout, "agent");
    const first = computeRandomFreeMapCell(new Set(), {
      rng: () => 0.95,
      worldLayout: layout,
    });
    expect(pointCellInZone(first.x, first.y, zone)).toBe(true);
  });

  it("skips occupied keys while staying in the agent zone", () => {
    const layout = testLayout();
    const zone = pickZoneForGroup(layout, "agent");
    const occupied = new Set<string>();
    addOccupiedCell(occupied, { cellX: 5, cellY: 5 });
    const next = computeRandomFreeMapCell(occupied, {
      rng: () => 0.5,
      worldLayout: layout,
    });
    expect(pointCellInZone(next.x, next.y, zone)).toBe(true);
    expect(occupied.has(occupancyKey(next.x, next.y))).toBe(false);
  });

  it("throws when all agent-zone occupancy points are occupied", () => {
    const layout = testLayout();
    const zone = pickZoneForGroup(layout, "agent");
    const occupied = new Set<string>();
    for (const p of listOccupancyPointsForZone(zone)) {
      occupied.add(occupancyKey(p.x, p.y));
    }
    expect(() =>
      computeRandomFreeMapCell(occupied, { worldLayout: layout })
    ).toThrow("computeRandomFreeMapCell: no free grid cell");
  });

  it("keeps new arrivals away from existing occupants with minDistance", () => {
    const layout = testLayout();
    const zone = pickZoneForGroup(layout, "agent");
    const next = computeRandomFreeMapCell(new Set(), {
      rng: () => 0,
      existingOccupants: [{ x: 5.4, y: 5.4 }],
      minDistance: 1.5,
      worldLayout: layout,
    });
    const distance = Math.hypot(next.x - 5.4, next.y - 5.4);
    expect(distance).toBeGreaterThanOrEqual(1.5);
    expect(pointCellInZone(next.x, next.y, zone)).toBe(true);
  });
});

describe("computeRandomFreeMapCellInSpatialZone / computeSpaceStructureAnchor", () => {
  it("places space anchors in the space primary zone", () => {
    const layout = testLayout();
    const zone = pickZoneForGroup(layout, "space");
    const p = computeSpaceStructureAnchor({
      occupied: new Set(),
      existingOccupants: [],
      structureAnchors: [],
      worldLayout: layout,
    });
    expect(pointCellInZone(p.x, p.y, zone)).toBe(true);
  });

  it("computeSpaceStructureAnchor keeps anchors separated", () => {
    const layout = testLayout();
    const first = computeSpaceStructureAnchor({
      occupied: new Set(),
      existingOccupants: [],
      structureAnchors: [],
      worldLayout: layout,
    });
    const second = computeSpaceStructureAnchor({
      occupied: new Set(),
      existingOccupants: [],
      structureAnchors: [first],
      worldLayout: layout,
    });
    expect(
      Math.hypot(second.x - first.x, second.y - first.y)
    ).toBeGreaterThanOrEqual(SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE - 0.05);
  });

  it("supports explicit space zone allocation with world layout", () => {
    const layout = testLayout();
    const zone = pickZoneForGroup(layout, "space");
    const p = computeRandomFreeMapCellInSpatialZone(new Set(), 2, {
      existingOccupants: [],
      structureAnchors: [],
      worldLayout: layout,
    });
    expect(pointCellInZone(p.x, p.y, zone)).toBe(true);
  });
});

describe("computeFreeMapCell (deprecated)", () => {
  it("delegates to random allocator inside the agent zone", () => {
    const layout = testLayout();
    const zone = pickZoneForGroup(layout, "agent");
    const next = computeFreeMapCell(new Set(), 0, layout);
    expect(pointCellInZone(next.x, next.y, zone)).toBe(true);
  });
});
