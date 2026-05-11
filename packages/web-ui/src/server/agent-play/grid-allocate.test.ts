import { describe, expect, it } from "vitest";
import {
  listAllowedOccupancyPoints,
  pointCellInSpatialZone,
  SPATIAL_ZONE_INDEX_AGENTS,
  SPATIAL_ZONE_INDEX_SPACES,
} from "@agent-play/sdk";
import {
  computeFreeMapCell,
  computeRandomFreeMapCell,
  computeRandomFreeMapCellInSpatialZone,
  computeSpaceStructureAnchor,
  SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE,
} from "./grid-allocate.js";

const occupancyKey = (x: number, y: number): string =>
  `${(Math.round(x * 5) / 5).toFixed(3)},${(Math.round(y * 5) / 5).toFixed(3)}`;

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
  it("selects inside the agent spatial zone (Q1)", () => {
    const first = computeRandomFreeMapCell(new Set(), { rng: () => 0.95 });
    expect(
      pointCellInSpatialZone(first.x, first.y, SPATIAL_ZONE_INDEX_AGENTS)
    ).toBe(true);
  });

  it("skips occupied keys while staying in the agent zone", () => {
    const occupied = new Set<string>();
    addOccupiedCell(occupied, { cellX: 5, cellY: 5 });
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.5 });
    expect(
      pointCellInSpatialZone(next.x, next.y, SPATIAL_ZONE_INDEX_AGENTS)
    ).toBe(true);
    expect(occupied.has(occupancyKey(next.x, next.y))).toBe(false);
  });

  it("throws when all agent-zone occupancy points are occupied", () => {
    const occupied = new Set<string>();
    for (const p of listAllowedOccupancyPoints()) {
      occupied.add(occupancyKey(p.x, p.y));
    }
    expect(() => computeRandomFreeMapCell(occupied)).toThrow(
      "computeRandomFreeMapCell: no free grid cell"
    );
  });

  it("keeps new arrivals away from existing occupants with minDistance", () => {
    const next = computeRandomFreeMapCell(new Set(), {
      rng: () => 0,
      existingOccupants: [{ x: 5.4, y: 5.4 }],
      minDistance: 1.5,
    });
    const distance = Math.hypot(next.x - 5.4, next.y - 5.4);
    expect(distance).toBeGreaterThanOrEqual(1.5);
    expect(
      pointCellInSpatialZone(next.x, next.y, SPATIAL_ZONE_INDEX_AGENTS)
    ).toBe(true);
  });
});

describe("computeRandomFreeMapCellInSpatialZone / computeSpaceStructureAnchor", () => {
  it("places space anchors in the space spatial zone (Q3)", () => {
    const p = computeSpaceStructureAnchor({
      occupied: new Set(),
      existingOccupants: [],
      structureAnchors: [],
    });
    expect(
      pointCellInSpatialZone(p.x, p.y, SPATIAL_ZONE_INDEX_SPACES)
    ).toBe(true);
  });

  it("computeSpaceStructureAnchor keeps anchors separated", () => {
    const first = computeSpaceStructureAnchor({
      occupied: new Set(),
      existingOccupants: [],
      structureAnchors: [],
    });
    const second = computeSpaceStructureAnchor({
      occupied: new Set(),
      existingOccupants: [],
      structureAnchors: [first],
    });
    expect(
      Math.hypot(second.x - first.x, second.y - first.y)
    ).toBeGreaterThanOrEqual(SPACE_STRUCTURE_ANCHOR_MIN_DISTANCE - 0.05);
  });

  it("supports explicit space zone allocation", () => {
    const p = computeRandomFreeMapCellInSpatialZone(
      new Set(),
      SPATIAL_ZONE_INDEX_SPACES,
      {
        existingOccupants: [],
        structureAnchors: [],
      }
    );
    expect(
      pointCellInSpatialZone(p.x, p.y, SPATIAL_ZONE_INDEX_SPACES)
    ).toBe(true);
  });
});

describe("computeFreeMapCell (deprecated)", () => {
  it("delegates to random allocator inside the agent zone", () => {
    const next = computeFreeMapCell(new Set(), 0);
    expect(
      pointCellInSpatialZone(next.x, next.y, SPATIAL_ZONE_INDEX_AGENTS)
    ).toBe(true);
  });
});
