import { beforeEach, describe, expect, it } from "vitest";
import {
  layoutHeightFromScrollMax,
  metaFontSizePx,
  resetAgentChatDisplaySettings,
  setAgentChatDisplaySettings,
} from "./preview-chat-settings.js";

beforeEach(() => {
  resetAgentChatDisplaySettings();
});

describe("layoutHeightFromScrollMax", () => {
  it("adds chrome for panel positioning", () => {
    expect(layoutHeightFromScrollMax(220)).toBe(236);
  });
});

describe("metaFontSizePx", () => {
  it("scales below body size", () => {
    expect(metaFontSizePx(13)).toBe(10);
    expect(metaFontSizePx(16)).toBe(12);
  });
});

describe("setAgentChatDisplaySettings", () => {
  it("clamps values into allowed ranges and defaults to readable typography", () => {
    resetAgentChatDisplaySettings();
    const defaults = setAgentChatDisplaySettings({});
    expect(defaults.fontSizePx).toBe(13);
    expect(defaults.panelWidthPx).toBe(280);
    expect(defaults.scrollMaxHeightPx).toBe(220);
    const s = setAgentChatDisplaySettings({
      fontSizePx: 99,
      panelWidthPx: 10,
      scrollMaxHeightPx: 900,
    });
    expect(s.fontSizePx).toBe(22);
    expect(s.panelWidthPx).toBe(180);
    expect(s.scrollMaxHeightPx).toBe(420);
  });
});
