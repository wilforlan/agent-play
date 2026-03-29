import { beforeEach, describe, expect, it } from "vitest";
import {
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

  it("toggles showChatUi, debugMode, and joystickEnabled", () => {
    setPreviewViewSettings({
      showChatUi: false,
      debugMode: true,
      joystickEnabled: true,
    });
    const s = getPreviewViewSettings();
    expect(s.showChatUi).toBe(false);
    expect(s.debugMode).toBe(true);
    expect(s.joystickEnabled).toBe(true);
  });
});
