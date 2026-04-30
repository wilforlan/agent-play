import { describe, expect, it } from "vitest";
import { computeFreeMapCell, computeRandomFreeMapCell } from "./grid-allocate.js";

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
  it("selects from the first quartile when it has valid candidates", () => {
    const first = computeRandomFreeMapCell(new Set(), { rng: () => 0.95 });
    expect(first.x).toBeGreaterThanOrEqual(0.3);
    expect(first.x).toBeLessThan(1.3);
    expect(first.y).toBeGreaterThanOrEqual(1.3);
    expect(first.y).toBeLessThan(2.3);
  });

  it("falls through to the second quartile when first quartile is full", () => {
    const occupied = new Set<string>();
    addOccupiedCell(occupied, { cellX: 0, cellY: 1 });
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.5 });
    expect(next.x).toBeGreaterThanOrEqual(0.3);
    expect(next.x).toBeLessThan(1.3);
    expect(next.y).toBeGreaterThanOrEqual(2.3);
    expect(next.y).toBeLessThan(3.3);
  });

  it("falls through to fourth quartile when earlier quartiles are full", () => {
    const occupied = new Set<string>();
    addOccupiedCell(occupied, { cellX: 0, cellY: 1 });
    addOccupiedCell(occupied, { cellX: 0, cellY: 2 });
    addOccupiedCell(occupied, { cellX: 18, cellY: -1 });
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.5 });
    expect(next.x).toBeGreaterThanOrEqual(18.3);
    expect(next.x).toBeLessThan(19.3);
    expect(next.y).toBeGreaterThanOrEqual(0.3);
    expect(next.y).toBeLessThan(1.3);
  });

  it("respects already occupied cells while staying in allowed regions", () => {
    const occupied = new Set<string>();
    addOccupiedCell(occupied, { cellX: 0, cellY: 1 });
    addOccupiedCell(occupied, { cellX: 0, cellY: 2 });
    addOccupiedCell(occupied, { cellX: 18, cellY: 0 });
    addOccupiedCell(occupied, { cellX: 18, cellY: 1 });
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.95 });
    expect(next.x).toBeGreaterThanOrEqual(18.3);
    expect(next.x).toBeLessThan(19.3);
    expect(next.y).toBeGreaterThanOrEqual(-0.7);
    expect(next.y).toBeLessThan(0.3);
  });

  it("throws when all generated occupancy points are occupied", () => {
    const occupied = new Set<string>();
    for (let i = 0; i < 300; i += 1) {
      let p: { x: number; y: number };
      try {
        p = computeRandomFreeMapCell(occupied, { rng: () => 0 });
      } catch {
        break;
      }
      const key = occupancyKey(p.x, p.y);
      occupied.add(key);
    }
    expect(() => computeRandomFreeMapCell(occupied)).toThrow(
      "computeRandomFreeMapCell: no free grid cell"
    );
  });

  it("keeps new arrivals away from existing occupants with minDistance", () => {
    const next = computeRandomFreeMapCell(new Set(), {
      rng: () => 0,
      existingOccupants: [{ x: 0.4, y: 1.4 }],
      minDistance: 1.5,
    });
    const distance = Math.hypot(next.x - 0.4, next.y - 1.4);
    expect(distance).toBeGreaterThanOrEqual(1.5);
  });
});

describe("computeFreeMapCell (deprecated)", () => {
  it("delegates to random allocator and returns a free allowed point", () => {
    const next = computeFreeMapCell(new Set(), 0);
    expect(next.x).toBeGreaterThanOrEqual(0.2);
    expect(next.y).toBeGreaterThanOrEqual(-0.8);
  });
});
