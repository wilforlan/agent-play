import { describe, expect, it } from "vitest";

import { getNextPanelFromDelta } from "./home-swipe";

describe("home swipe transitions", () => {
  it("keeps current panel on mobile", () => {
    expect(
      getNextPanelFromDelta({
        currentPanel: "game",
        deltaY: 120,
        isDesktop: false,
      }),
    ).toBe("game");
  });

  it("switches from game to landing on desktop swipe down", () => {
    expect(
      getNextPanelFromDelta({
        currentPanel: "game",
        deltaY: 120,
        isDesktop: true,
      }),
    ).toBe("landing");
  });

  it("switches from landing to game on desktop swipe up", () => {
    expect(
      getNextPanelFromDelta({
        currentPanel: "landing",
        deltaY: -120,
        isDesktop: true,
      }),
    ).toBe("game");
  });

  it("ignores small gestures", () => {
    expect(
      getNextPanelFromDelta({
        currentPanel: "game",
        deltaY: 24,
        isDesktop: true,
      }),
    ).toBe("game");
  });
});
