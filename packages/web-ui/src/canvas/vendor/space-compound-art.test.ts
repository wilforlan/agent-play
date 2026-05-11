import { describe, expect, it } from "vitest";
import {
  compoundFenceRadiusPx,
  layoutCompoundAmenityOffsetsWorld,
} from "./space-compound-art.js";

describe("space-compound-art", () => {
  it("lays out symmetric offsets around a compound center", () => {
    const three = layoutCompoundAmenityOffsetsWorld({ count: 3, radiusWorld: 3 });
    expect(three.length).toBe(3);
    const dists = three.map((o) => Math.hypot(o.dx, o.dy));
    for (const d of dists) {
      expect(d).toBeCloseTo(3, 5);
    }
  });

  it("scales fence radius with amenity count", () => {
    expect(compoundFenceRadiusPx({ amenityCount: 5, cellScale: 48 })).toBeGreaterThan(
      compoundFenceRadiusPx({ amenityCount: 1, cellScale: 48 })
    );
  });
});
