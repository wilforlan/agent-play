import { describe, expect, it } from "vitest";
import { computeFreeMapCell, computeRandomFreeMapCell } from "./grid-allocate.js";

describe("computeRandomFreeMapCell", () => {
  it("builds all allowed x/y combinations and picks randomly from free points", () => {
    const first = computeRandomFreeMapCell(new Set(), { rng: () => 0 });
    expect(first.x).toBeGreaterThanOrEqual(0.3);
    expect(first.x).toBeLessThan(1.3);
    expect(first.y).toBeGreaterThanOrEqual(1.3);
    expect(first.y).toBeLessThan(2.3);

    const occupied = new Set<string>(
      Array.from({ length: 5 * 5 * 2 }, (_, i) => {
        const dx = Math.floor(i / 10) % 5;
        const dy = i % 5;
        const row = Math.floor(i / 25);
        const baseY = row === 0 ? 1 : 2;
        const x = 0.3 + (dx + 0.5) / 5;
        const y = baseY + 0.3 + (dy + 0.5) / 5;
        return `${(Math.round(x * 5) / 5).toFixed(3)},${(Math.round(y * 5) / 5).toFixed(3)}`;
      })
    );
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.5 });
    expect(next.x).toBeGreaterThanOrEqual(18.3);
    expect(next.x).toBeLessThan(19.3);
    expect(next.y).toBeGreaterThanOrEqual(-0.7);
    expect(next.y).toBeLessThan(2.3);
  });

  it("respects already occupied cells while staying in allowed regions", () => {
    const occupied = new Set<string>(
      Array.from({ length: 5 * 5 * 4 }, (_, i) => {
        const region = Math.floor(i / 25);
        const local = i % 25;
        const dx = Math.floor(local / 5);
        const dy = local % 5;
        const baseX = region < 2 ? 0 : 18;
        const baseY =
          region === 0 ? 1 : region === 1 ? 2 : region === 2 ? -1 : 0;
        const x = baseX + 0.3 + (dx + 0.5) / 5;
        const y = baseY + 0.3 + (dy + 0.5) / 5;
        return `${(Math.round(x * 5) / 5).toFixed(3)},${(Math.round(y * 5) / 5).toFixed(3)}`;
      })
    );
    const next = computeRandomFreeMapCell(occupied, { rng: () => 0.95 });
    expect(next.x).toBeGreaterThanOrEqual(18.3);
    expect(next.x).toBeLessThan(19.3);
    expect(next.y).toBeGreaterThanOrEqual(1.3);
    expect(next.y).toBeLessThan(2.3);
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
      const key = `${(Math.round(p.x * 5) / 5).toFixed(3)},${(
        Math.round(p.y * 5) / 5
      ).toFixed(3)}`;
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
