import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROXIMITY_RADIUS,
  findNearestProximityPartner,
  proximityKeyToAction,
} from "./proximity-interaction.js";

describe("findNearestProximityPartner", () => {
  it("returns null when alone", () => {
    const positions = new Map([
      ["p1", { x: 0, y: 0 }],
    ]);
    expect(
      findNearestProximityPartner({
        primaryId: "p1",
        positions,
        radius: DEFAULT_PROXIMITY_RADIUS,
      })
    ).toBe(null);
  });

  it("returns the other player when within radius", () => {
    const positions = new Map([
      ["p1", { x: 0, y: 0 }],
      ["p2", { x: 0.5, y: 0 }],
    ]);
    expect(
      findNearestProximityPartner({
        primaryId: "p1",
        positions,
        radius: DEFAULT_PROXIMITY_RADIUS,
      })
    ).toBe("p2");
  });

  it("returns null when beyond radius", () => {
    const positions = new Map([
      ["p1", { x: 0, y: 0 }],
      ["p2", { x: 5, y: 5 }],
    ]);
    expect(
      findNearestProximityPartner({
        primaryId: "p1",
        positions,
        radius: DEFAULT_PROXIMITY_RADIUS,
      })
    ).toBe(null);
  });

  it("prefers the closest of several candidates", () => {
    const positions = new Map([
      ["p1", { x: 0, y: 0 }],
      ["p2", { x: 0.4, y: 0 }],
      ["p3", { x: 0.2, y: 0 }],
    ]);
    expect(
      findNearestProximityPartner({
        primaryId: "p1",
        positions,
        radius: DEFAULT_PROXIMITY_RADIUS,
      })
    ).toBe("p3");
  });
});

describe("proximityKeyToAction", () => {
  it("maps A C Z Y", () => {
    expect(proximityKeyToAction("a")).toBe("assist");
    expect(proximityKeyToAction("C")).toBe("chat");
    expect(proximityKeyToAction("z")).toBe("zone");
    expect(proximityKeyToAction("Y")).toBe("yield");
    expect(proximityKeyToAction("x")).toBe(null);
  });
});
