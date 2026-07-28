// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearPreviewUiPlacements,
  getPanelPlacement,
  loadPreviewUiPlacements,
  PREVIEW_UI_PLACEMENTS_STORAGE_KEY,
  savePanelPlacement,
  type PreviewPanelPlacementId,
} from "./preview-ui-placements.js";

describe("preview ui placements", () => {
  afterEach(() => {
    localStorage.removeItem(PREVIEW_UI_PLACEMENTS_STORAGE_KEY);
    clearPreviewUiPlacements();
  });

  it("returns null for unknown panel placements", () => {
    expect(getPanelPlacement("messages")).toBeNull();
  });

  it("persists and reloads panel placements from localStorage", () => {
    savePanelPlacement("session", { leftPx: 40, topPx: 120, collapsed: true });
    savePanelPlacement("debug", { leftPx: 16, topPx: 380, collapsed: false });

    clearPreviewUiPlacements();
    const loaded = loadPreviewUiPlacements();
    expect(loaded.panels.session).toEqual({
      leftPx: 40,
      topPx: 120,
      collapsed: true,
    });
    expect(loaded.panels.debug).toEqual({
      leftPx: 16,
      topPx: 380,
      collapsed: false,
    });
    expect(getPanelPlacement("session")).toEqual({
      leftPx: 40,
      topPx: 120,
      collapsed: true,
    });
  });

  it("preserves collapsed when updating only coordinates", () => {
    savePanelPlacement("messages", {
      leftPx: 1,
      topPx: 2,
      collapsed: true,
    });
    savePanelPlacement("messages", { leftPx: 10, topPx: 20 });
    expect(getPanelPlacement("messages")).toEqual({
      leftPx: 10,
      topPx: 20,
      collapsed: true,
    });
  });

  it("preserves coordinates when updating only collapsed", () => {
    savePanelPlacement("session", { leftPx: 40, topPx: 80 });
    savePanelPlacement("session", { collapsed: true });
    expect(getPanelPlacement("session")).toEqual({
      leftPx: 40,
      topPx: 80,
      collapsed: true,
    });
  });

  it("ignores invalid stored coordinates", () => {
    localStorage.setItem(
      PREVIEW_UI_PLACEMENTS_STORAGE_KEY,
      JSON.stringify({
        panels: {
          messages: { leftPx: Number.NaN, topPx: 10 },
          session: { leftPx: "nope", topPx: 2 },
          proximity: { leftPx: 8, topPx: 9, collapsed: "yes" },
          debug: { leftPx: 1, topPx: 2, collapsed: true },
        },
      })
    );
    const loaded = loadPreviewUiPlacements();
    expect(loaded.panels.messages).toBeUndefined();
    expect(loaded.panels.session).toBeUndefined();
    expect(loaded.panels.proximity).toEqual({ leftPx: 8, topPx: 9 });
    expect(loaded.panels.debug).toEqual({
      leftPx: 1,
      topPx: 2,
      collapsed: true,
    });
  });

  it("overwrites a single panel without dropping others", () => {
    const ids: PreviewPanelPlacementId[] = ["messages", "session"];
    savePanelPlacement(ids[0]!, { leftPx: 1, topPx: 2 });
    savePanelPlacement(ids[1]!, { leftPx: 3, topPx: 4 });
    savePanelPlacement("messages", { leftPx: 10, topPx: 20 });
    expect(getPanelPlacement("messages")).toEqual({ leftPx: 10, topPx: 20 });
    expect(getPanelPlacement("session")).toEqual({ leftPx: 3, topPx: 4 });
  });
});
