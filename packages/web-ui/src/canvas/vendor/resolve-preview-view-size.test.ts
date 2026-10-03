import { describe, expect, it } from "vitest";
import {
  PREVIEW_VIEW_HEIGHT_DESKTOP,
  PREVIEW_VIEW_HEIGHT_MOBILE,
  PREVIEW_VIEW_WIDTH,
  resolvePreviewViewSize,
} from "./resolve-preview-view-size.js";

describe("resolvePreviewViewSize", () => {
  it("keeps the classic desktop board", () => {
    expect(
      resolvePreviewViewSize({ viewportWidth: 1280, viewportHeight: 800 })
    ).toEqual({
      width: PREVIEW_VIEW_WIDTH,
      height: PREVIEW_VIEW_HEIGHT_DESKTOP,
    });
  });

  it("uses a taller board on narrow mobile viewports", () => {
    const size = resolvePreviewViewSize({
      viewportWidth: 390,
      viewportHeight: 844,
    });
    expect(size.width).toBe(PREVIEW_VIEW_WIDTH);
    expect(size.height).toBeGreaterThan(PREVIEW_VIEW_HEIGHT_DESKTOP);
    expect(size.height).toBeGreaterThanOrEqual(PREVIEW_VIEW_HEIGHT_MOBILE);
  });

  it("falls back to the mobile height when viewport height is unknown", () => {
    expect(resolvePreviewViewSize({ viewportWidth: 390 })).toEqual({
      width: PREVIEW_VIEW_WIDTH,
      height: PREVIEW_VIEW_HEIGHT_MOBILE,
    });
  });
});
