import { describe, expect, it } from "vitest";
import {
  canvasHostLocalToViewport,
  clampFixedPanelToViewport,
  computeHousePurchasePanelPosition,
  computeParkingTicketTooltipPosition,
} from "./overworld-fixed-panel-position.js";

const VIEW_W = 720;
const VIEW_H = 520;

describe("canvasHostLocalToViewport", () => {
  it("maps logical canvas coords through CSS-scaled host rect into viewport px", () => {
    // Mobile: host is CSS-scaled to ~half the logical 720×520 canvas.
    const hostRect = { left: 20, top: 80, width: 360, height: 260 };
    const center = canvasHostLocalToViewport({
      hostRect,
      localX: VIEW_W * 0.5,
      localY: VIEW_H * 0.55,
      viewW: VIEW_W,
      viewH: VIEW_H,
    });
    expect(center.x).toBe(20 + 360 * 0.5);
    expect(center.y).toBe(80 + 260 * 0.55);
  });

  it("maps 1:1 when the host is unscaled", () => {
    const hostRect = { left: 100, top: 50, width: VIEW_W, height: VIEW_H };
    const point = canvasHostLocalToViewport({
      hostRect,
      localX: 200,
      localY: 100,
      viewW: VIEW_W,
      viewH: VIEW_H,
    });
    expect(point).toEqual({ x: 300, y: 150 });
  });
});

describe("clampFixedPanelToViewport", () => {
  it("keeps the panel fully inside the browser viewport", () => {
    const clamped = clampFixedPanelToViewport({
      left: 300,
      top: 100,
      panelWidth: 280,
      panelHeight: 220,
      viewportWidth: 390,
      viewportHeight: 700,
      marginPx: 8,
    });
    expect(clamped.left).toBe(390 - 280 - 8);
    expect(clamped.top).toBe(100);
    expect(clamped.left + 280).toBeLessThanOrEqual(390 - 8);
  });

  it("clamps away from the left and top edges", () => {
    const clamped = clampFixedPanelToViewport({
      left: -40,
      top: -20,
      panelWidth: 280,
      panelHeight: 220,
      viewportWidth: 390,
      viewportHeight: 700,
      marginPx: 8,
    });
    expect(clamped.left).toBe(8);
    expect(clamped.top).toBe(8);
  });
});

describe("computeHousePurchasePanelPosition", () => {
  it("centers the house panel over the scaled canvas host and keeps it in viewport on mobile", () => {
    const hostRect = { left: 15, top: 90, width: 360, height: 260 };
    const pos = computeHousePurchasePanelPosition({
      hostRect,
      viewW: VIEW_W,
      viewH: VIEW_H,
      panelWidth: 280,
      panelHeight: 240,
      viewportWidth: 390,
      viewportHeight: 844,
      marginPx: 8,
    });
    // Must not use unscaled VIEW_W (that lands near left+360-120 ≈ 255 and clips).
    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.left + 280).toBeLessThanOrEqual(390 - 8);
    expect(pos.top).toBeGreaterThanOrEqual(8);
    expect(pos.top + 240).toBeLessThanOrEqual(844 - 8);
    // Horizontally centered on the scaled host when that fits.
    const hostCenterX = hostRect.left + hostRect.width / 2;
    expect(pos.left).toBe(Math.round(hostCenterX - 140));
  });
});

describe("computeParkingTicketTooltipPosition", () => {
  it("places the parking tooltip near a bay using scaled host coords and clamps on mobile", () => {
    const hostRect = { left: 15, top: 90, width: 360, height: 260 };
    const pos = computeParkingTicketTooltipPosition({
      hostRect,
      localX: 600,
      localY: 400,
      viewW: VIEW_W,
      viewH: VIEW_H,
      panelWidth: 260,
      panelHeight: 280,
      viewportWidth: 390,
      viewportHeight: 844,
      marginPx: 8,
    });
    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.left + 260).toBeLessThanOrEqual(390 - 8);
    expect(pos.top).toBeGreaterThanOrEqual(8);
    expect(pos.top + 280).toBeLessThanOrEqual(844 - 8);
  });

  it("anchors above the bay when there is room in an unscaled viewport", () => {
    const hostRect = { left: 0, top: 0, width: VIEW_W, height: VIEW_H };
    const pos = computeParkingTicketTooltipPosition({
      hostRect,
      localX: 360,
      localY: 300,
      viewW: VIEW_W,
      viewH: VIEW_H,
      panelWidth: 260,
      panelHeight: 200,
      viewportWidth: 1200,
      viewportHeight: 900,
      marginPx: 8,
      gapAbovePx: 12,
    });
    expect(pos.left).toBe(Math.round(360 - 130));
    expect(pos.top).toBe(Math.round(300 - 200 - 12));
  });
});
