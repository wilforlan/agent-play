// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  createEmptyHouseStreetContent,
  PARKING_HOUSE_COUNT,
} from "@agent-play/sdk/browser";
import { PARKING_BAY_ANCHORS } from "./parking-street-proximity.js";
import {
  buildHouseDoorAnchors,
  canEnterHouseAsOwner,
  findNearestHouseDoor,
  HOUSE_DOOR_ANCHORS,
  houseDoorAnchorCount,
} from "./house-street-proximity.js";

describe("house-street-proximity", () => {
  it("exposes one door anchor per parking-lane house", () => {
    expect(houseDoorAnchorCount()).toBe(PARKING_HOUSE_COUNT);
    expect(HOUSE_DOOR_ANCHORS.length).toBe(PARKING_HOUSE_COUNT);
  });

  it("aligns house door bays with parking bay anchors", () => {
    for (const door of HOUSE_DOOR_ANCHORS) {
      const bay = PARKING_BAY_ANCHORS.find(
        (a) => a.bay === door.bay && a.layer === 1
      );
      expect(bay).toBeDefined();
      expect(Math.abs(door.x - (bay?.x ?? 0) + 0.5)).toBeLessThan(0.01);
    }
  });

  it("finds the nearest door within radius", () => {
    const nearest = findNearestHouseDoor({
      playerWorld: { x: 3.1, y: 8.85 },
      maxDistance: 2.5,
    });
    expect(nearest?.houseId).toBe(1);
    expect(nearest?.distance).toBeLessThan(1);
  });

  it("returns null when player is far from all doors", () => {
    expect(
      findNearestHouseDoor({
        playerWorld: { x: 0, y: 0 },
        maxDistance: 1,
      })
    ).toBeNull();
  });

  it("allows owner entry only for the matching node", () => {
    const street = createEmptyHouseStreetContent();
    const house = street.houses[0];
    if (house === undefined) {
      throw new Error("house");
    }
    const owned = {
      ...house,
      ownerNodeId: "node-a",
      ownerDisplayName: "Alex",
      purchasedAt: "2026-05-12T00:00:00.000Z",
    };
    expect(
      canEnterHouseAsOwner({ viewerNodeId: "node-a", house: owned })
    ).toBe(true);
    expect(
      canEnterHouseAsOwner({ viewerNodeId: "node-b", house: owned })
    ).toBe(false);
    expect(
      canEnterHouseAsOwner({ viewerNodeId: "node-a", house })
    ).toBe(false);
  });

  it("builds anchors from parking zone maxY", () => {
    const anchors = buildHouseDoorAnchors({ parkingZoneMaxY: 12 });
    expect(anchors[0]?.y).toBe(11.8);
  });
});
