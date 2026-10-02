/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { Container, Text } from "pixi.js";
import { defaultMultiversePalette } from "./multiverse-engine.js";
import {
  EDUCATION_CENTER_COUNT,
  EDUCATION_LIGHT_BESIDE_OFFSET,
  EDUCATION_STREET_LIGHT_COUNT,
  buildEducationCampusLayer,
  buildEducationCenterAnchors,
  educationLightWorldPosition,
  pickEducationCampusZone,
} from "./education-campus-layer.js";
import {
  EDUCATION_CENTER_DAY_PASS_APU,
  educationCenterDayPassLabel,
  findNearestEducationCenter,
} from "./education-campus-proximity.js";

describe("education campus layer", () => {
  it("picks the education primary zone", () => {
    const zone = pickEducationCampusZone([
      {
        id: "zone-parking-strip",
        streetLabel: "Oak Lane",
        rect: { minX: 0, maxX: 19, minY: 6, maxY: 9 },
        primaryGroup: "parking",
      },
      {
        id: "zone-education-campus",
        streetLabel: "Elm Street",
        rect: { minX: 0, maxX: 19, minY: 12, maxY: 14 },
        primaryGroup: "education",
      },
    ]);
    expect(zone?.id).toBe("zone-education-campus");
  });

  it("places street lights beside buildings, not on their x", () => {
    expect(EDUCATION_STREET_LIGHT_COUNT).toBe(4);
    const light = educationLightWorldPosition({
      buildingX: 10,
      buildingY: 12.55,
    });
    expect(light.x).toBe(10 - EDUCATION_LIGHT_BESIDE_OFFSET);
    expect(light.y).toBe(12.55);
  });

  it("builds left-edge name strip and center buildings", () => {
    const layer = buildEducationCampusLayer({
      palette: defaultMultiversePalette,
      cellScale: 32,
      worldToLocal: (wx, wy) => ({ x: wx * 32, y: -wy * 32 }),
      zone: {
        id: "zone-education-campus",
        streetLabel: "Elm Street",
        rect: { minX: 0, maxX: 19, minY: 12, maxY: 14 },
        primaryGroup: "education",
      },
      bandRect: { minX: -1, maxX: 20, minY: 12, maxY: 14 },
    });
    expect(layer).toBeInstanceOf(Container);
    const labels = layer.children
      .filter((child) => child instanceof Text)
      .map((t) => t.text);
    expect(labels).toContain("Elm Street");
    expect(labels).toContain("Foundations");
    expect(layer.children.length).toBeGreaterThan(
      EDUCATION_STREET_LIGHT_COUNT + EDUCATION_CENTER_COUNT
    );
  });
});

describe("education campus proximity", () => {
  it("finds the nearest center within radius", () => {
    const anchors = buildEducationCenterAnchors({
      bandRect: { minX: 0, maxX: 19, minY: 12, maxY: 14 },
      zoneRect: { minX: 0, maxX: 19, minY: 12, maxY: 14 },
    });
    const first = anchors[0];
    if (first === undefined) {
      throw new Error("expected anchor");
    }
    const nearest = findNearestEducationCenter({
      playerWorld: { x: first.x + 0.4, y: first.y },
      anchors,
    });
    expect(nearest?.centerId).toBe(first.centerId);
  });

  it("labels day entry at 5 APU", () => {
    expect(EDUCATION_CENTER_DAY_PASS_APU).toBe(5);
    expect(educationCenterDayPassLabel("Foundations")).toBe(
      "Foundations · 5 APU day entry"
    );
  });
});
