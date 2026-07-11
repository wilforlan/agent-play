import { describe, expect, it } from "vitest";
import {
  HOUSE_CATALOG,
  HOUSE_WORLD_X,
  HouseStreetContentSchema,
  PARKING_HOUSE_COUNT,
  createEmptyHouseStreetContent,
  findHouseSlot,
  isHouseOwned,
} from "./house-content-model.js";

describe("HouseStreetContent", () => {
  it("creates four parking-lane houses aligned with HOUSE_WORLD_X", () => {
    const content = createEmptyHouseStreetContent();
    const parsed = HouseStreetContentSchema.parse(content);
    expect(parsed.houses).toHaveLength(PARKING_HOUSE_COUNT);
    expect(parsed.houses.map((h) => h.worldX)).toEqual([...HOUSE_WORLD_X]);
  });

  it("assigns catalog prices to each house", () => {
    const content = createEmptyHouseStreetContent();
    expect(content.houses.map((h) => h.priceUsd)).toEqual(
      HOUSE_CATALOG.map((c) => c.priceUsd)
    );
  });

  it("starts with no owners", () => {
    const content = createEmptyHouseStreetContent();
    for (const house of content.houses) {
      expect(isHouseOwned(house)).toBe(false);
    }
  });

  it("finds house by id", () => {
    const content = createEmptyHouseStreetContent();
    const house = findHouseSlot(content, 2);
    expect(house?.id).toBe("house-2");
    expect(house?.bay).toBe(2);
  });
});
