/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import {
  findNearestParkingBay,
  PARKING_BAY_ANCHORS,
} from "./parking-street-proximity.js";

describe("parking-street-proximity", () => {
  it("exposes four bays with two layers each", () => {
    const bays = new Set(PARKING_BAY_ANCHORS.map((a) => a.bay));
    expect(bays.size).toBe(4);
    expect(PARKING_BAY_ANCHORS.length).toBe(8);
  });

  it("finds nearest bay when player stands at anchor", () => {
    const anchor = PARKING_BAY_ANCHORS[0];
    if (anchor === undefined) {
      throw new Error("anchor");
    }
    const found = findNearestParkingBay({
      playerWorld: { x: anchor.x, y: anchor.y },
    });
    expect(found?.bay).toBe(anchor.bay);
    expect(found?.layer).toBe(anchor.layer);
  });

  it("returns null when player is far from parking anchors", () => {
    expect(
      findNearestParkingBay({ playerWorld: { x: 0, y: 0 }, maxDistance: 1 })
    ).toBeNull();
  });
});
