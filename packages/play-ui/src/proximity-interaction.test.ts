import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROXIMITY_RADIUS,
  DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
  findNearestProximityPartner,
  findNearestStructureProximityTarget,
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

  it("when allowedPartnerIds is set, ignores positions not in the allowlist", () => {
    const positions = new Map([
      ["p1", { x: 0, y: 0 }],
      ["stale", { x: 0.05, y: 0 }],
      ["p2", { x: 0.3, y: 0 }],
    ]);
    expect(
      findNearestProximityPartner({
        primaryId: "p1",
        positions,
        radius: DEFAULT_PROXIMITY_RADIUS,
        allowedPartnerIds: new Set(["p2"]),
      })
    ).toBe("p2");
  });

  it("when allowedPartnerIds excludes all in-range partners, returns null", () => {
    const positions = new Map([
      ["p1", { x: 0, y: 0 }],
      ["p2", { x: 0.3, y: 0 }],
    ]);
    expect(
      findNearestProximityPartner({
        primaryId: "p1",
        positions,
        radius: DEFAULT_PROXIMITY_RADIUS,
        allowedPartnerIds: new Set(["other"]),
      })
    ).toBe(null);
  });
});

describe("findNearestStructureProximityTarget", () => {
  it("returns null when the player is far from every structure", () => {
    expect(
      findNearestStructureProximityTarget({
        player: { x: 0, y: 0 },
        structures: [
          { id: "s1", x: 10, y: 10, spaceIds: ["space-a"] },
        ],
        radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
      })
    ).toBe(null);
  });

  it("returns the nearest in-range structure with its spaceId", () => {
    const result = findNearestStructureProximityTarget({
      player: { x: 0, y: 0 },
      structures: [
        { id: "s-far", x: 4, y: 4, spaceIds: ["space-far"] },
        { id: "s-near", x: 1.2, y: 0, spaceIds: ["space-near"] },
      ],
      radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
    });
    expect(result).not.toBeNull();
    expect(result?.structureId).toBe("s-near");
    expect(result?.spaceId).toBe("space-near");
  });

  it("ignores structures without any spaceId", () => {
    const result = findNearestStructureProximityTarget({
      player: { x: 0, y: 0 },
      structures: [
        { id: "s-bare", x: 0.5, y: 0, spaceIds: [] },
        { id: "s-space", x: 1.4, y: 0, spaceIds: ["space-1"] },
      ],
      radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
    });
    expect(result?.structureId).toBe("s-space");
  });

  it("collapses grouped structures with the same compound spaceId set", () => {
    const result = findNearestStructureProximityTarget({
      player: { x: 0, y: 0 },
      structures: [
        { id: "s-a", x: 0.4, y: 0, spaceIds: ["space-shared"] },
        { id: "s-b", x: 0.6, y: 0, spaceIds: ["space-shared"] },
        { id: "s-c", x: 0.5, y: 0.1, spaceIds: ["space-shared"] },
      ],
      radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
    });
    expect(result?.spaceId).toBe("space-shared");
    expect(result?.centroid.x).toBeCloseTo(0.5, 1);
    expect(result?.centroid.y).toBeCloseTo(0.033, 1);
  });

  it("triggers when the player stands at the compound centroid even when every anchor is outside the per-anchor radius", () => {
    const result = findNearestStructureProximityTarget({
      player: { x: 5, y: 5 },
      structures: [
        { id: "s-a", x: 3.2, y: 5, spaceIds: ["space-x"] },
        { id: "s-b", x: 6.8, y: 5, spaceIds: ["space-x"] },
      ],
      radius: 1.6,
    });
    expect(result?.spaceId).toBe("space-x");
    expect(result?.centroid.x).toBeCloseTo(5, 5);
    expect(result?.centroid.y).toBeCloseTo(5, 5);
  });

  it("ignores a compound whose centroid is beyond the radius even if one anchor is close", () => {
    const result = findNearestStructureProximityTarget({
      player: { x: 0, y: 0 },
      structures: [
        { id: "s-a", x: 1, y: 0, spaceIds: ["space-far"] },
        { id: "s-b", x: 9, y: 0, spaceIds: ["space-far"] },
      ],
      radius: 1.6,
    });
    expect(result).toBe(null);
  });

  it("uses the structure's primaryAmenity when present", () => {
    const result = findNearestStructureProximityTarget({
      player: { x: 0, y: 0 },
      structures: [
        {
          id: "s-shop",
          x: 1,
          y: 0,
          spaceIds: ["space-shop"],
          primaryAmenity: "shop",
        },
      ],
      radius: DEFAULT_STRUCTURE_PROXIMITY_RADIUS,
    });
    expect(result?.primaryAmenity).toBe("shop");
  });
});

describe("proximityKeyToAction", () => {
  it("maps A C P Z Y", () => {
    expect(proximityKeyToAction("a")).toBe("assist");
    expect(proximityKeyToAction("C")).toBe("chat");
    expect(proximityKeyToAction("p")).toBe("push_to_talk");
    expect(proximityKeyToAction("z")).toBe("zone");
    expect(proximityKeyToAction("Y")).toBe("yield");
    expect(proximityKeyToAction("x")).toBe(null);
  });
});
