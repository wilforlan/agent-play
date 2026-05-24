// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  buildAmenitySupermarketStage,
  layoutSupermarketSlots,
  SUPERMARKET_ROW_LABELS,
  supermarketSpawnPosition,
  type SupermarketItemSnapshot,
} from "./amenity-supermarket-stage.js";

const item = (
  id: string,
  row: 1 | 2 | 3 | 4,
  column: 1 | 2 | 3 | 4 | 5,
  overrides?: Partial<SupermarketItemSnapshot>
): SupermarketItemSnapshot => ({
  id,
  row,
  column,
  name: `Item ${id}`,
  priceUsd: 1,
  sale: { status: "available" },
  ...overrides,
});

describe("amenity-supermarket-stage: layoutSupermarketSlots", () => {
  it("always returns a 4×5 grid", () => {
    const slots = layoutSupermarketSlots([]);
    expect(slots).toHaveLength(20);
    for (const slot of slots) {
      expect(slot.item).toBeNull();
    }
  });

  it("fills the matching grid cells with items", () => {
    const slots = layoutSupermarketSlots([
      item("apple", 1, 1),
      item("shirt", 2, 3),
    ]);
    const filled = slots.filter((s) => s.item !== null);
    expect(filled).toHaveLength(2);
    expect(
      slots.find((s) => s.row === 1 && s.column === 1)?.item?.id
    ).toBe("apple");
    expect(
      slots.find((s) => s.row === 2 && s.column === 3)?.item?.id
    ).toBe("shirt");
  });
});

describe("amenity-supermarket-stage: row labels", () => {
  it("labels rows 1..4 as Lane 1 through Lane 4", () => {
    expect(SUPERMARKET_ROW_LABELS).toEqual({
      1: "Lane 1",
      2: "Lane 2",
      3: "Lane 3",
      4: "Lane 4",
    });
  });
});

describe("amenity-supermarket-stage: spawn", () => {
  it("spawns away from the exit door at (0,0)", () => {
    const spawn = supermarketSpawnPosition();
    expect(Math.hypot(spawn.x, spawn.y)).toBeGreaterThan(2);
  });
});

describe("amenity-supermarket-stage: buildAmenitySupermarketStage", () => {
  it("returns a stage with id 'amenitySupermarket'", () => {
    const stage = buildAmenitySupermarketStage({ cellScale: 24, items: [] });
    expect(stage.id).toBe("amenitySupermarket");
  });

  it("refresh() repopulates the grid", () => {
    const stage = buildAmenitySupermarketStage({ cellScale: 24, items: [] });
    stage.refresh([item("a", 1, 1), item("b", 2, 2)]);
    const filled = stage.getSlots().filter((s) => s.item !== null);
    expect(filled).toHaveLength(2);
  });

  it("findNearbyItem returns only filled slots", () => {
    const stage = buildAmenitySupermarketStage({
      cellScale: 24,
      items: [item("a", 1, 1)],
    });
    const target = stage.getSlots().find((s) => s.item !== null);
    expect(target).toBeTruthy();
    if (target) {
      expect(stage.findNearbyItem({ x: target.x, y: target.y })?.id).toBe(
        target.id
      );
    }
  });
});
