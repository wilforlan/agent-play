/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { Graphics } from "pixi.js";
import {
  buildParkWorldBackdrop,
  computeParkWorldBackdropPlacement,
  getParkBackdropLayoutMetrics,
  PARK_SKY_GRASS_RATIO,
} from "./scene-backgrounds.js";

describe("buildParkWorldBackdrop", () => {
  it("keeps sky to the top 5% so the park fills the rest of the backdrop", () => {
    expect(PARK_SKY_GRASS_RATIO).toBe(0.05);
    const heightPx = 800;
    const metrics = getParkBackdropLayoutMetrics(heightPx);
    expect(metrics.skyHeight).toBe(metrics.grassTop);
    expect(metrics.grassTop).toBe(heightPx * 0.05);
    expect(heightPx - metrics.grassTop).toBe(heightPx * 0.95);
  });

  it("mounts sky then grass as first backdrop layers", () => {
    const root = buildParkWorldBackdrop(400, 600, 42);
    expect(root.children.length).toBeGreaterThanOrEqual(2);
    expect(root.children[0]).toBeInstanceOf(Graphics);
    expect(root.children[1]).toBeInstanceOf(Graphics);
  });
});

describe("computeParkWorldBackdropPlacement", () => {
  it("sizes the park to 100% of world width and the full padded world height", () => {
    const placement = computeParkWorldBackdropPlacement({
      originX: 24,
      worldOriginScreenY: -550,
      cellScale: 48,
      mapMinX: -1,
      mapMinY: -1,
      mapMaxX: 20,
      mapMaxY: 20,
      trailingMarginX: 56,
    });

    expect(placement.x).toBe(0);
    expect(placement.y).toBe(-550);
    expect(placement.widthPx).toBe(24 + 22 * 48 + 56);
    expect(placement.heightPx).toBe(22 * 48);
    expect(placement.heightPx).toBe(1056);
  });

  it("places sky in the top 5% of that world-height backdrop", () => {
    const placement = computeParkWorldBackdropPlacement({
      originX: 24,
      worldOriginScreenY: -550,
      cellScale: 48,
      mapMinX: -1,
      mapMinY: -1,
      mapMaxX: 20,
      mapMaxY: 20,
      trailingMarginX: 56,
    });
    const metrics = getParkBackdropLayoutMetrics(placement.heightPx);
    expect(metrics.grassTop).toBeCloseTo(placement.heightPx * 0.05, 10);
    expect(placement.heightPx - metrics.grassTop).toBeCloseTo(
      placement.heightPx * 0.95,
      10
    );
  });
});
