// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { createPreviewBottomBar } from "./preview-settings-toolbar.js";

describe("createPreviewBottomBar", () => {
  it("places the documentation link as the first control on the left informatics cluster", () => {
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
});
