// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import {
  createPreviewBottomBar,
  ensurePreviewLayoutStyles,
} from "./preview-settings-toolbar.js";
import {
  getPreviewViewSettings,
  resetPreviewViewSettings,
  setPreviewViewSettings,
} from "./preview-view-settings.js";

describe("createPreviewBottomBar", () => {
  it("injects fullscreen world and floating overlay layout styles", () => {
    ensurePreviewLayoutStyles();

    const styleText =
      document.getElementById("agent-play-preview-settings-toolbar-styles")
        ?.textContent ?? "";

    expect(styleText).toContain(".preview-game-panel");
    expect(styleText).toContain("height: 100dvh");
    expect(styleText).toContain(".preview-canvas-stage");
    expect(styleText).toContain("inset: 0");
    expect(styleText).toContain(".preview-floating-panel");
    expect(styleText).toContain(".preview-bottom-bar");
    expect(styleText).toContain("position: absolute");
    expect(styleText).toContain(".preview-global-chat-room.preview-floating-panel");
    expect(styleText).toContain("min-height: 0");
  });

  it("places the documentation link as the first control on the left informatics cluster", () => {
    resetPreviewViewSettings();
    const chatPanel = document.createElement("div");
    const sessionToolsPanel = document.createElement("div");
    const sessionProfilePanel = document.createElement("div");
    const bar = createPreviewBottomBar({
      chatPanel,
      sessionToolsPanel,
      sessionProfilePanel,
      onThemeApplied: () => {},
      onAgentSettingsChanged: () => {},
    });

    const docLink = bar.querySelector("a.preview-app-footer__docs");
    expect(docLink).not.toBeNull();
    expect(docLink?.getAttribute("href")).toBe("/doc");
    expect(docLink?.textContent?.trim()).toBe("Documentation");

    const informatics = bar.querySelector(".preview-informatics-bar");
    expect(informatics?.firstElementChild).toBe(docLink);
  });

  it("renders language menu with selected language label", () => {
    resetPreviewViewSettings();
    setPreviewViewSettings({ language: "Igbo" });
    const chatPanel = document.createElement("div");
    const sessionToolsPanel = document.createElement("div");
    const sessionProfilePanel = document.createElement("div");
    const bar = createPreviewBottomBar({
      chatPanel,
      sessionToolsPanel,
      sessionProfilePanel,
      onThemeApplied: () => {},
      onAgentSettingsChanged: () => {},
    });
    const languageToggle = bar.querySelector(
      ".preview-language-settings-toggle"
    ) as HTMLButtonElement | null;
    expect(languageToggle?.textContent?.trim()).toBe("Language - Igbo");
  });

  it("updates and persists language from the toolbar select", () => {
    resetPreviewViewSettings();
    const chatPanel = document.createElement("div");
    const sessionToolsPanel = document.createElement("div");
    const sessionProfilePanel = document.createElement("div");
    const bar = createPreviewBottomBar({
      chatPanel,
      sessionToolsPanel,
      sessionProfilePanel,
      onThemeApplied: () => {},
      onAgentSettingsChanged: () => {},
    });
    const languageToggle = bar.querySelector(
      ".preview-language-settings-toggle"
    ) as HTMLButtonElement;
    languageToggle.click();
    const select = bar.querySelector(
      ".preview-language-settings-select"
    ) as HTMLSelectElement;
    select.value = "Yoruba";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(getPreviewViewSettings().language).toBe("Yoruba");
    expect(languageToggle.textContent?.trim()).toBe("Language - Yoruba");
  });
});
