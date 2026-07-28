// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { HouseFixtureSlot } from "@agent-play/sdk/browser";
import {
  estimateHouseFixtureCalloutHalfWidthPx,
  findNearestHouseFixture,
  HOUSE_FIXTURE_PROXIMITY_RADIUS,
  houseFixtureDisplayLabel,
  resolveHouseFixtureCalloutPosition,
} from "./house-fixture-proximity.js";

const fixtures: readonly HouseFixtureSlot[] = [
  { kind: "bed", variant: "single-left", x: 2, y: 1.2 },
  { kind: "wardrobe", variant: "single", x: 8.5, y: 1.5 },
  { kind: "mirror", variant: "wall", x: 5, y: 0.4 },
  { kind: "window", variant: "double", x: 1.5, y: 0.3 },
];

describe("houseFixtureDisplayLabel", () => {
  it("returns readable labels for each fixture kind", () => {
    expect(houseFixtureDisplayLabel("bed")).toBe("Bed");
    expect(houseFixtureDisplayLabel("wardrobe")).toBe("Wardrobe");
    expect(houseFixtureDisplayLabel("mirror")).toBe("Mirror");
    expect(houseFixtureDisplayLabel("window")).toBe("Window");
  });
});

describe("findNearestHouseFixture", () => {
  it("returns the nearest fixture within the default radius", () => {
    const near = findNearestHouseFixture({
      fixtures,
      player: { x: 2.1, y: 1.3 },
    });
    expect(near?.kind).toBe("bed");
    expect(near?.label).toBe("Bed");
  });

  it("returns null when no fixture is within range", () => {
    const near = findNearestHouseFixture({
      fixtures,
      player: { x: 5, y: 5 },
      radius: 1,
    });
    expect(near).toBeNull();
  });

  it("exposes a positive default proximity radius", () => {
    expect(HOUSE_FIXTURE_PROXIMITY_RADIUS).toBeGreaterThan(1);
  });
});

describe("resolveHouseFixtureCalloutPosition", () => {
  it("keeps edge fixtures' labels inside the stage", () => {
    const topEdge = resolveHouseFixtureCalloutPosition({
      fixtureXPx: 48,
      fixtureYPx: 10,
      labelHalfWidthPx: 24,
      labelHeightPx: 16,
      stageWidthPx: 320,
      stageHeightPx: 224,
      preferAboveOffsetPx: 12,
      marginPx: 6,
    });
    expect(topEdge.y).toBeGreaterThanOrEqual(22);
    expect(topEdge.x).toBeGreaterThanOrEqual(30);

    const leftEdge = resolveHouseFixtureCalloutPosition({
      fixtureXPx: 4,
      fixtureYPx: 80,
      labelHalfWidthPx: 30,
      labelHeightPx: 16,
      stageWidthPx: 320,
      stageHeightPx: 224,
      preferAboveOffsetPx: 12,
      marginPx: 6,
    });
    expect(leftEdge.x).toBe(36);

    const rightEdge = resolveHouseFixtureCalloutPosition({
      fixtureXPx: 318,
      fixtureYPx: 80,
      labelHalfWidthPx: 30,
      labelHeightPx: 16,
      stageWidthPx: 320,
      stageHeightPx: 224,
      preferAboveOffsetPx: 12,
      marginPx: 6,
    });
    expect(rightEdge.x).toBe(284);
  });

  it("estimates a usable half-width from the label text", () => {
    expect(
      estimateHouseFixtureCalloutHalfWidthPx({
        label: "Wardrobe",
        fontSizePx: 12,
      })
    ).toBeGreaterThan(
      estimateHouseFixtureCalloutHalfWidthPx({
        label: "Bed",
        fontSizePx: 12,
      })
    );
  });
});
