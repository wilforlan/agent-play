import { describe, expect, it } from "vitest";
import {
  boundsContain,
  clampWorldPosition,
  type WorldBounds,
} from "./world-bounds.js";

const sample: WorldBounds = { minX: 0, minY: 0, maxX: 10, maxY: 8 };

describe("clampWorldPosition", () => {
  it("leaves interior points unchanged", () => {
    expect(clampWorldPosition({ x: 3, y: 4 }, sample)).toEqual({ x: 3, y: 4 });
  });

  it("clamps to min edges", () => {
    expect(clampWorldPosition({ x: -2, y: -1 }, sample)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("clamps to max edges", () => {
    expect(clampWorldPosition({ x: 20, y: 20 }, sample)).toEqual({
      x: 10,
      y: 8,
    });
  });

  it("clamps corners independently", () => {
    expect(clampWorldPosition({ x: -1, y: 9 }, sample)).toEqual({
      x: 0,
      y: 8,
    });
  });
});

describe("boundsContain", () => {
  it("is true on edges", () => {
    expect(boundsContain(sample, { x: 0, y: 0 })).toBe(true);
    expect(boundsContain(sample, { x: 10, y: 8 })).toBe(true);
  });

  it("is false outside", () => {
    expect(boundsContain(sample, { x: -0.01, y: 4 })).toBe(false);
  });
});
