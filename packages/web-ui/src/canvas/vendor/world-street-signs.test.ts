/** @vitest-environment happy-dom */
import { Container, Text } from "pixi.js";
import { describe, expect, it } from "vitest";
import { defaultMultiversePalette } from "./multiverse-engine.js";
import {
  PARKING_STREET_FURNITURE_BESIDE_OFFSET,
  PARKING_STREET_LIGHT_COUNT,
  PARKING_STREET_SIGN_SCALE,
  buildTSignPost,
  mountStreetSignPosts,
  parkingStreetLightWorldXs,
  parkingStreetSignWorldX,
  streetSignMetrics,
  toStreetSignZones,
} from "./world-street-signs.js";

const findLabelText = (root: Container): Text | null => {
  for (const child of root.children) {
    if (child instanceof Text) {
      return child;
    }
    if (child instanceof Container) {
      const nested = findLabelText(child);
      if (nested !== null) {
        return nested;
      }
    }
  }
  return null;
};

describe("streetSignMetrics", () => {
  it("grows the panel when scale is larger than one", () => {
    const base = streetSignMetrics({ cellScale: 32 });
    const large = streetSignMetrics({
      cellScale: 32,
      scale: PARKING_STREET_SIGN_SCALE,
    });
    expect(large.panelW).toBeGreaterThan(base.panelW);
    expect(large.panelH).toBeGreaterThan(base.panelH);
    expect(large.poleH).toBeGreaterThan(base.poleH);
  });
});

describe("buildTSignPost", () => {
  it("renders a larger Oak Lane label when scaled up", () => {
    const normal = buildTSignPost({
      palette: defaultMultiversePalette,
      cellScale: 32,
      label: "Oak Lane",
    });
    const large = buildTSignPost({
      palette: defaultMultiversePalette,
      cellScale: 32,
      label: "Oak Lane",
      scale: PARKING_STREET_SIGN_SCALE,
    });
    const normalText = findLabelText(normal);
    const largeText = findLabelText(large);
    expect(normalText?.text).toBe("Oak Lane");
    expect(largeText?.text).toBe("Oak Lane");
    expect(Number(largeText?.style.fontSize)).toBeGreaterThan(
      Number(normalText?.style.fontSize)
    );
  });
});

describe("toStreetSignZones", () => {
  it("keeps column streets at default size and enlarges the parking street", () => {
    const zones = toStreetSignZones([
      {
        id: "zone-agent-strip",
        streetLabel: "St. John St.",
        rect: { minX: 0, maxX: 6, minY: 0, maxY: 2 },
        primaryGroup: "agent",
      },
      {
        id: "zone-parking-strip",
        streetLabel: "Oak Lane",
        rect: { minX: 0, maxX: 19, minY: 6, maxY: 9 },
        primaryGroup: "parking",
      },
    ]);
    expect(zones).toEqual([
      {
        id: "zone-agent-strip",
        streetLabel: "St. John St.",
        rect: { minX: 0, maxX: 6, minY: 0, maxY: 2 },
      },
      {
        id: "zone-parking-strip",
        streetLabel: "Oak Lane",
        rect: { minX: 0, maxX: 19, minY: 6, maxY: 9 },
        scale: PARKING_STREET_SIGN_SCALE,
        lightCount: PARKING_STREET_LIGHT_COUNT,
      },
    ]);
  });

  it("omits Elm Street education campus so it has no T-sign post", () => {
    const zones = toStreetSignZones([
      {
        id: "zone-parking-strip",
        streetLabel: "Oak Lane",
        rect: { minX: 0, maxX: 19, minY: 6, maxY: 9 },
        primaryGroup: "parking",
      },
      {
        id: "zone-education-campus",
        streetLabel: "Elm Street",
        rect: { minX: 0, maxX: 19, minY: 10, maxY: 12 },
        primaryGroup: "education",
      },
    ]);
    expect(zones.map((z) => z.id)).toEqual(["zone-parking-strip"]);
    expect(zones.some((z) => z.streetLabel === "Elm Street")).toBe(false);
  });
});

describe("mountStreetSignPosts", () => {
  it("mounts a larger Oak Lane sign with multiple street lights", () => {
    const layer = new Container();
    mountStreetSignPosts({
      layer,
      palette: defaultMultiversePalette,
      worldToLocal: (wx, wy) => ({ x: wx * 32, y: wy * 32 }),
      cellScale: 32,
      zones: [
        {
          id: "zone-parking-strip",
          streetLabel: "Oak Lane",
          rect: { minX: 0, maxX: 19, minY: 6, maxY: 9 },
          scale: PARKING_STREET_SIGN_SCALE,
          lightCount: PARKING_STREET_LIGHT_COUNT,
        },
      ],
    });
    expect(layer.children.length).toBe(1 + PARKING_STREET_LIGHT_COUNT);
    const labels = layer.children
      .map((child) =>
        child instanceof Container ? findLabelText(child)?.text ?? null : null
      )
      .filter((label): label is string => label !== null);
    expect(labels).toEqual(["Oak Lane"]);
  });

  it("places Oak Lane street lights and the street sign beside houses, not on top of them", () => {
    const layer = new Container();
    const placed: Array<{ x: number; y: number; label: string | null }> = [];
    mountStreetSignPosts({
      layer,
      palette: defaultMultiversePalette,
      worldToLocal: (wx, wy) => {
        placed.push({
          x: wx,
          y: wy,
          label: null,
        });
        return { x: wx * 32, y: wy * 32 };
      },
      cellScale: 32,
      zones: [
        {
          id: "zone-parking-strip",
          streetLabel: "Oak Lane",
          rect: { minX: 0, maxX: 19, minY: 6, maxY: 9 },
          scale: PARKING_STREET_SIGN_SCALE,
          lightCount: PARKING_STREET_LIGHT_COUNT,
        },
      ],
    });

    const houseYs = placed.map((p) => p.y);
    expect(houseYs.every((y) => y === 9 - 0.2)).toBe(true);
    expect(houseYs.every((y) => y !== 9 + 1)).toBe(true);

    const lightXs = parkingStreetLightWorldXs({
      rect: { minX: 0, maxX: 19, minY: 6, maxY: 9 },
      lightCount: PARKING_STREET_LIGHT_COUNT,
    });
    expect(lightXs).toEqual([
      3 - PARKING_STREET_FURNITURE_BESIDE_OFFSET,
      8 - PARKING_STREET_FURNITURE_BESIDE_OFFSET,
      13 - PARKING_STREET_FURNITURE_BESIDE_OFFSET,
      18 - PARKING_STREET_FURNITURE_BESIDE_OFFSET,
    ]);
    expect(parkingStreetSignWorldX()).toBe(
      3 - PARKING_STREET_FURNITURE_BESIDE_OFFSET * 2
    );
  });
});
