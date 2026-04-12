import { describe, expect, it } from "vitest";
import {
  clampCameraToWorldRect,
  easeInOutCubic,
  navigationZoomPulse01,
} from "./world-nav-math.js";

describe("easeInOutCubic", () => {
  it("maps endpoints to 0 and 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("clamps out-of-range t", () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });
});

describe("clampCameraToWorldRect", () => {
  it("clamps horizontal pan when the world is wider than the view", () => {
    const rect = { left: 24, top: 10, right: 1000, bottom: 800 };
    const out = clampCameraToWorldRect({
      camX: 0,
      camY: 0,
      zoom: 1,
      viewW: 720,
      viewH: 520,
      rect,
    });
    expect(out.camX).toBeGreaterThanOrEqual(720 - rect.right);
    expect(out.camX).toBeLessThanOrEqual(-rect.left);
  });

  it("centers when the world is narrower than the view", () => {
    const rect = { left: 300, top: 200, right: 400, bottom: 350 };
    const out = clampCameraToWorldRect({
      camX: 0,
      camY: 0,
      zoom: 1,
      viewW: 720,
      viewH: 520,
      rect,
    });
    expect(out.camX).toBeCloseTo((720 - rect.right - rect.left) / 2, 5);
    expect(out.camY).toBeCloseTo((520 - rect.bottom - rect.top) / 2, 5);
  });
});

describe("navigationZoomPulse01", () => {
  it("returns 1 outside the pulse window", () => {
    expect(navigationZoomPulse01(0, 300)).toBe(1);
    expect(navigationZoomPulse01(400, 300)).toBe(1);
  });

  it("peaks above 1 inside the window", () => {
    const mid = navigationZoomPulse01(150, 300);
    expect(mid).toBeGreaterThan(1);
  });
});
