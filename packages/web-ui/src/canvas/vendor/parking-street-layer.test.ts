/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { createEmptyParkingStreetContent } from "@agent-play/sdk/browser";
import {
  buildParkingStreetLayer,
  computeBandPixelExtents,
  laneDashSegments,
} from "./parking-street-layer.js";
import { defaultMultiversePalette } from "./multiverse-engine.js";

describe("laneDashSegments", () => {
  it("extends the final dash segment to the right edge", () => {
    const segments = laneDashSegments({
      left: 0,
      right: 100,
      dashW: 30,
      gap: 10,
    });
    const last = segments.at(-1);
    expect(last).toBeDefined();
    expect((last?.x ?? 0) + (last?.w ?? 0)).toBe(100);
  });
});

describe("computeBandPixelExtents", () => {
  it("spans padded map minX through maxX when bandRect is wider than zoneRect", () => {
    const extents = computeBandPixelExtents({
      bandRect: { minX: -1, maxX: 20, minY: 4, maxY: 7 },
      worldToLocal: (wx, wy) => ({ x: (wx + 1) * 32, y: wy * 32 }),
    });
    expect(extents.left).toBe(0);
    expect(extents.right).toBe(704);
  });
});

describe("buildParkingStreetLayer", () => {
  it("renders asphalt, houses, and occupied car with sign", () => {
    const content = createEmptyParkingStreetContent();
    const spot = content.spots.find((s) => s.bay === 1 && s.layer === 1);
    if (spot === undefined) {
      throw new Error("spot");
    }
    const occupied = {
      ...spot,
      occupant: {
        nodeId: "node-1",
        carPurchaseId: "p1",
        displayNick: "Coupe",
        colorHex: "#ff0000",
        model: "GT",
        tier: "1h" as const,
        purchasedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T01:00:00.000Z",
      },
    };
    const street = {
      ...content,
      spots: content.spots.map((s) =>
        s.bay === 1 && s.layer === 1 ? occupied : s
      ),
    };
    const layer = buildParkingStreetLayer({
      zoneRect: { minX: 0, maxX: 19, minY: 4, maxY: 7 },
      parkingStreet: street,
      palette: defaultMultiversePalette,
      cellScale: 32,
      worldToLocal: (wx, wy) => ({ x: wx * 32, y: wy * 32 }),
    });
    expect(layer.children.length).toBeGreaterThan(4);
  });
});
