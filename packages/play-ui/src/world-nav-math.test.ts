import { describe, expect, it } from "vitest";
import {
  clampCameraToWorldRect,
  computeWorldRootScrollRect,
} from "./world-nav-math.js";

describe("computeWorldRootScrollRect", () => {
  it("matches worldToWorldRootLocal extrema over padded map corners (20×20-style bounds)", () => {
    const originX = 24;
    const cellScale = 48;
    const mapMinX = -1;
    const mapMinY = -1;
    const mapMaxX = 20;
    const mapMaxY = 20;
    const maxBottom = 520 - 14;
    const h = mapMaxY - mapMinY + 1;
    const worldOriginScreenY = maxBottom - h * cellScale;

    const rect = computeWorldRootScrollRect({
      originX,
      worldOriginScreenY,
      cellScale,
      mapMinX,
      mapMinY,
      mapMaxX,
      mapMaxY,
    });

    const worldToLocal = (wx: number, wy: number) => ({
      x: originX + (wx - mapMinX) * cellScale,
      y: worldOriginScreenY + (mapMaxY - wy) * cellScale,
    });

    expect(rect.left).toBe(worldToLocal(mapMinX, mapMinY).x);
    expect(rect.right).toBe(worldToLocal(mapMaxX, mapMinY).x);
    expect(rect.top).toBe(worldToLocal(mapMaxX, mapMaxY).y);
    expect(rect.bottom).toBe(worldToLocal(mapMinX, mapMinY).y);

    const center = worldToLocal(9.5, 9.5);
    expect(center.y).toBeGreaterThanOrEqual(rect.top);
    expect(center.y).toBeLessThanOrEqual(rect.bottom);
  });

  it("allows vertical camera motion when northern content has negative local Y", () => {
    const rect = computeWorldRootScrollRect({
      originX: 24,
      worldOriginScreenY: -550,
      cellScale: 48,
      mapMinX: -1,
      mapMinY: -1,
      mapMaxX: 20,
      mapMaxY: 20,
    });

    const out = clampCameraToWorldRect({
      camX: 0,
      camY: 300,
      zoom: 1,
      viewW: 720,
      viewH: 520,
      rect,
    });

    expect(out.camY).toBeGreaterThan(0);
    expect(out.camY).toBeLessThanOrEqual(-rect.top);

    const signLocalY = -46;
    const screenY = out.camY + signLocalY;
    expect(screenY).toBeGreaterThanOrEqual(0);
    expect(screenY).toBeLessThanOrEqual(520);
  });
});
