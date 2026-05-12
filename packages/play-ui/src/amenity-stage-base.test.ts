// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { clampToBounds, findNearestSlot } from "./amenity-stage-base.js";

const BOUNDS = { minX: 0, minY: 0, maxX: 6, maxY: 5 } as const;

describe("amenity-stage-base: clampToBounds", () => {
  it("returns the original position when already inside the bounds", () => {
    expect(clampToBounds({ x: 2, y: 3 }, BOUNDS)).toEqual({ x: 2, y: 3 });
  });

  it("clamps each axis independently", () => {
    expect(clampToBounds({ x: -5, y: 99 }, BOUNDS)).toEqual({
      x: 0,
      y: 5,
    });
  });
});

describe("amenity-stage-base: findNearestSlot", () => {
  it("returns the closest slot inside the radius", () => {
    const slots = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 3, y: 0 },
      { id: "c", x: 1, y: 1 },
    ];
    const near = findNearestSlot(slots, { x: 1, y: 0.5 });
    expect(near?.id).toBe("c");
  });

  it("returns null when no slot lies within the radius", () => {
    const slots = [{ id: "a", x: 10, y: 10 }];
    const near = findNearestSlot(slots, { x: 0, y: 0 }, 1);
    expect(near).toBeNull();
  });
});
