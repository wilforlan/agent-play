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
    expect(styleText).toMatch(
      /\.preview-bottom-bar \{[\s\S]*?border:\s*none[\s\S]*?background:\s*transparent/
    );
    expect(styleText).toMatch(
      /\.preview-bottom-bar \.preview-chat-settings-toggle,[\s\S]*?border:\s*none[\s\S]*?background:\s*transparent/
    );
    expect(styleText).toMatch(
      /\.preview-joystick-wrap \{[\s\S]*?left:\s*50%[\s\S]*?bottom:[\s\S]*?transform:\s*translateX\(-50%\)/
    );
    expect(styleText).toContain("position: absolute");
    expect(styleText).toContain(".preview-global-chat-room.preview-floating-panel");
    expect(styleText).toContain("min-height: 0");
    expect(styleText).toMatch(
      /@media \(max-width: 1023px\)[\s\S]*?\.preview-bottom-bar \{[\s\S]*?flex-direction:\s*column/
    );
    expect(styleText).toMatch(
      /@media \(max-width: 1023px\)[\s\S]*?\.preview-bottom-bar__collapse-toggle \{[\s\S]*?width:\s*28px/
    );
    expect(styleText).toContain("preview-canvas-stage--stationary-panels");
    expect(styleText).toContain(
      ".preview-game-col--right .preview-floating-panel--session"
    );
    expect(styleText).toContain("max-width: 100%");
  });

  it("places the read-the-docs link as the first control on the left informatics cluster", () => {
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
    expect(docLink?.textContent?.trim()).toBe("Read the docs");

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

  it("collapses and expands the toolbar menu from the caret control", () => {
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
    const toggle = bar.querySelector(
      ".preview-bottom-bar__collapse-toggle"
    ) as HTMLButtonElement | null;

    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    const caret = toggle?.querySelector(".preview-bottom-bar__collapse-caret");
    expect(caret).not.toBeNull();
    expect(
      caret?.classList.contains("preview-bottom-bar__collapse-caret--collapsed")
    ).toBe(false);
    toggle?.click();
    expect(bar.classList.contains("preview-bottom-bar--collapsed")).toBe(true);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(
      caret?.classList.contains("preview-bottom-bar__collapse-caret--collapsed")
    ).toBe(true);
    toggle?.click();
    expect(bar.classList.contains("preview-bottom-bar--collapsed")).toBe(false);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(
      caret?.classList.contains("preview-bottom-bar__collapse-caret--collapsed")
    ).toBe(false);
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
