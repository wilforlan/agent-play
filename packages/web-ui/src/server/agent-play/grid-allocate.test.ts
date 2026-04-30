import { describe, expect, it } from "vitest";
import { computeFreeMapCell, computeRandomFreeMapCell } from "./grid-allocate.js";

describe("computeRandomFreeMapCell", () => {
  it("builds all allowed x/y combinations and picks randomly from free points", () => {
    const first = computeRandomFreeMapCell(new Set(), { rng: () => 0 });
    expect(first).toEqual({ x: 0.2, y: 1.2 });

    const occupied = new Set<string>(["0,1", "0,2"]);
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.5 });
    expect(next).toEqual({ x: 18.2, y: 0.2 });
  });

  it("respects already occupied cells while staying in allowed regions", () => {
    const occupied = new Set<string>(["0,1", "0,2", "18,-1", "18,0"]);
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.95 });
    expect(next).toEqual({ x: 18.2, y: 1.2 });
  });

  it("throws when all generated occupancy points are occupied", () => {
    const occupied = new Set<string>(["0,1", "0,2", "18,-1", "18,0", "18,1"]);
    expect(() => computeRandomFreeMapCell(occupied)).toThrow(
      "computeRandomFreeMapCell: no free grid cell"
    );
  });
});

describe("computeFreeMapCell (deprecated)", () => {
  it("delegates to random allocator and returns a free allowed point", () => {
    const next = computeFreeMapCell(new Set(), 0);
    expect(next.x).toBeGreaterThanOrEqual(0.2);
    expect(next.y).toBeGreaterThanOrEqual(-0.8);
  });
});
