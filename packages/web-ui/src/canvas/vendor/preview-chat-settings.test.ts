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
    expect(layoutHeightFromScrollMax(148)).toBe(164);
  });
});

describe("metaFontSizePx", () => {
  it("scales below body size", () => {
    expect(metaFontSizePx(8)).toBe(6);
    expect(metaFontSizePx(12)).toBe(9);
  });
});

describe("setAgentChatDisplaySettings", () => {
  it("clamps values into allowed ranges", () => {
    resetAgentChatDisplaySettings();
    const s = setAgentChatDisplaySettings({
      fontSizePx: 99,
      panelWidthPx: 10,
      scrollMaxHeightPx: 500,
    });
    expect(s.fontSizePx).toBe(18);
    expect(s.panelWidthPx).toBe(100);
    expect(s.scrollMaxHeightPx).toBe(200);
  });
});
