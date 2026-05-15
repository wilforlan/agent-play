import { beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultViewSettings,
  getPreviewViewSettings,
  resetPreviewViewSettings,
  setPreviewViewSettings,
} from "./preview-view-settings.js";

beforeEach(() => {
  resetPreviewViewSettings();
});

describe("setPreviewViewSettings", () => {
  it("keeps theme id when valid", () => {
    const s = setPreviewViewSettings({ themeId: "tokyo" });
    expect(s.themeId).toBe("tokyo");
    expect(getPreviewViewSettings().themeId).toBe("tokyo");
  });

  it("toggles showChatUi, debugMode, joystickEnabled, and p2aEnabled", () => {
    setPreviewViewSettings({
      showChatUi: false,
      debugMode: true,
      joystickEnabled: true,
      p2aEnabled: true,
      deepLogsEnabled: true,
    });
    const s = getPreviewViewSettings();
    expect(s.showChatUi).toBe(false);
    expect(s.debugMode).toBe(true);
    expect(s.joystickEnabled).toBe(true);
    expect(s.p2aEnabled).toBe(true);
    expect(s.deepLogsEnabled).toBe(true);
  });

  it("defaults language to English and persists selected language", () => {
    expect(getDefaultViewSettings().language).toBe("English");
    const next = setPreviewViewSettings({ language: "Yoruba" });
    expect(next.language).toBe("Yoruba");
    expect(getPreviewViewSettings().language).toBe("Yoruba");
  });

  it("persists stationaryPanels preference", () => {
    expect(getDefaultViewSettings().stationaryPanels).toBe(false);
    const next = setPreviewViewSettings({ stationaryPanels: true });
    expect(next.stationaryPanels).toBe(true);
    expect(getPreviewViewSettings().stationaryPanels).toBe(true);
  });

  it("defaults world geography off and persists toggle", () => {
    expect(getDefaultViewSettings().worldGeographyEnabled).toBe(false);
    const next = setPreviewViewSettings({ worldGeographyEnabled: true });
    expect(next.worldGeographyEnabled).toBe(true);
    expect(getPreviewViewSettings().worldGeographyEnabled).toBe(true);
  });

  it("defaults occupancy debug overlays off and persists toggles", () => {
    expect(getDefaultViewSettings().debugOccupancyQuartiles).toBe(false);
    expect(getDefaultViewSettings().debugOccupancyFreeGrids).toBe(false);
    const next = setPreviewViewSettings({
      debugOccupancyQuartiles: true,
      debugOccupancyFreeGrids: true,
    });
    expect(next.debugOccupancyQuartiles).toBe(true);
    expect(next.debugOccupancyFreeGrids).toBe(true);
    expect(getPreviewViewSettings().debugOccupancyQuartiles).toBe(true);
  });
});
