/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { Graphics } from "pixi.js";
import {
  buildParkWorldBackdrop,
  getParkBackdropLayoutMetrics,
  PARK_SKY_GRASS_RATIO,
} from "./scene-backgrounds.js";

describe("buildParkWorldBackdrop", () => {
  it("uses a single sky band from top to grass line", () => {
    const heightPx = 800;
    const metrics = getParkBackdropLayoutMetrics(heightPx);
    expect(metrics.skyHeight).toBe(metrics.grassTop);
    expect(metrics.grassTop).toBe(heightPx * PARK_SKY_GRASS_RATIO);
  });

  it("mounts sky then grass as first backdrop layers", () => {
    const root = buildParkWorldBackdrop(400, 600, 42);
    expect(root.children.length).toBeGreaterThanOrEqual(2);
    expect(root.children[0]).toBeInstanceOf(Graphics);
    expect(root.children[1]).toBeInstanceOf(Graphics);
  });
});
