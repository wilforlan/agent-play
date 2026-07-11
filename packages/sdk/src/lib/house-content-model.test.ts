import { describe, expect, it } from "vitest";
import {
  HOUSE_CATALOG,
  HOUSE_WORLD_X,
  HouseStreetContentSchema,
  PARKING_HOUSE_COUNT,
  buildHouseOwnershipPanelLines,
  createEmptyHouseStreetContent,
  findHouseSlot,
  formatHouseOwnerDisplayName,
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

describe("formatHouseOwnerDisplayName", () => {
  it("combines owner name and signature within 24 characters", () => {
    expect(
      formatHouseOwnerDisplayName({ name: "Alex Kim", signature: "ak" })
    ).toBe("Alex Kim · AK");
  });

  it("truncates long names while keeping signature", () => {
    const label = formatHouseOwnerDisplayName({
      name: "Christopher Montgomery",
      signature: "cm",
    });
    expect(label.length).toBeLessThanOrEqual(24);
    expect(label.endsWith(" · CM")).toBe(true);
  });
});

describe("buildHouseOwnershipPanelLines", () => {
  it("returns security lines for owned houses", () => {
    const content = createEmptyHouseStreetContent();
    const house = content.houses[0];
    if (house === undefined) {
      throw new Error("house");
    }
    const owned = {
      ...house,
      ownerNodeId: "node-a",
      ownerDisplayName: "Alex · AK",
      ownerName: "Alex Kim",
      ownerSignature: "AK",
      purchasedAt: "2026-05-12T00:00:00.000Z",
    };
    const lines = buildHouseOwnershipPanelLines(owned);
    expect(lines[0]).toBe("PROPERTY RECORD");
    expect(lines.some((line) => line.includes("Alex Kim"))).toBe(true);
    expect(lines.some((line) => line.includes("AK"))).toBe(true);
    expect(lines.some((line) => line.includes("Security"))).toBe(true);
  });
});
