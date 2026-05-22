// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  buildAmenityShopStage,
  layoutShopSlots,
  shopSpawnPosition,
  SHOP_BOUNDS,
  type ShopItemSnapshot,
} from "./amenity-shop-stage.js";

const item = (
  id: string,
  overrides?: Partial<ShopItemSnapshot>
): ShopItemSnapshot => ({
  id,
  type: "book",
  name: `Book ${id}`,
  priceUsd: 9.99,
  sale: { status: "available" },
  ...overrides,
});

describe("amenity-shop-stage: layoutShopSlots", () => {
  it("returns an empty array for an empty input", () => {
    expect(layoutShopSlots([])).toEqual([]);
  });

  it("lays out items spaced evenly across the shelf", () => {
    const slots = layoutShopSlots([item("a"), item("b"), item("c")]);
    expect(slots).toHaveLength(3);
    expect(slots[0]?.x).toBeLessThan(slots[1]?.x ?? Infinity);
    expect(slots[1]?.x).toBeLessThan(slots[2]?.x ?? Infinity);
  });
});

describe("amenity-shop-stage: shopSpawnPosition", () => {
  it("spawns away from the exit door at (0, 0)", () => {
    const spawn = shopSpawnPosition();
    expect(Math.hypot(spawn.x, spawn.y)).toBeGreaterThan(2);
  });

  it("spawns inside the bounds", () => {
    const spawn = shopSpawnPosition();
    expect(spawn.x).toBeGreaterThanOrEqual(SHOP_BOUNDS.minX);
    expect(spawn.x).toBeLessThanOrEqual(SHOP_BOUNDS.maxX);
    expect(spawn.y).toBeGreaterThanOrEqual(SHOP_BOUNDS.minY);
    expect(spawn.y).toBeLessThanOrEqual(SHOP_BOUNDS.maxY);
  });
});

describe("amenity-shop-stage: buildAmenityShopStage", () => {
  it("returns a stage with id 'amenityShop'", () => {
    const stage = buildAmenityShopStage({ cellScale: 24, items: [] });
    expect(stage.id).toBe("amenityShop");
  });

  it("re-renders cards on refresh()", () => {
    const stage = buildAmenityShopStage({ cellScale: 24, items: [] });
    expect(stage.getSlots()).toHaveLength(0);
    stage.refresh([item("a"), item("b")]);
    expect(stage.getSlots()).toHaveLength(2);
  });

  it("locates the nearest item to a player", () => {
    const stage = buildAmenityShopStage({
      cellScale: 24,
      items: [item("a"), item("b"), item("c")],
    });
    const slots = stage.getSlots();
    const middle = slots[1];
    if (middle === undefined) throw new Error("expected middle slot");
    const near = stage.findNearbyItem({ x: middle.x, y: middle.y });
    expect(near?.id).toBe(middle.id);
  });

  it("anchors the exit door at stage-local (0, 0)", () => {
    const stage = buildAmenityShopStage({ cellScale: 24, items: [] });
    expect(stage.exitDoorAnchor).toEqual({ x: 0, y: 0 });
  });
});
