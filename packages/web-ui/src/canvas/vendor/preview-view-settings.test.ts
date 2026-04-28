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
    });
    const s = getPreviewViewSettings();
    expect(s.showChatUi).toBe(false);
    expect(s.debugMode).toBe(true);
    expect(s.joystickEnabled).toBe(true);
    expect(s.p2aEnabled).toBe(true);
  });

  it("defaults language to English and persists selected language", () => {
    expect(getDefaultViewSettings().language).toBe("English");
    const next = setPreviewViewSettings({ language: "Yoruba" });
    expect(next.language).toBe("Yoruba");
    expect(getPreviewViewSettings().language).toBe("Yoruba");
  });
});
