// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  createGameStreakPanel,
  powerUpsToNextBundle,
  shouldAutoPeekGameStreak,
} from "./game-streak-panel.js";

describe("game streak panel", () => {
  it("computes distance to the next bundle offer", () => {
    expect(powerUpsToNextBundle(0)).toBeGreaterThan(0);
    expect(powerUpsToNextBundle(10_000)).toBe(null);
  });

  it("anchors the games streak pill to the bottom of the viewport", () => {
    const parent = document.createElement("div");
    const panel = createGameStreakPanel({ parent, onRefresh: () => {} });
    const style = document.getElementById("preview-game-streak-styles");
    expect(style?.textContent).toMatch(
      /\.preview-game-streak-pill \{[\s\S]*?bottom:\s*max\(12px,\s*calc\(12px \+ env\(safe-area-inset-bottom/,
    );
    expect(style?.textContent).toMatch(
      /\.preview-game-streak-pill \{[\s\S]*?top:\s*auto/,
    );
    expect(style?.textContent).not.toMatch(
      /\.preview-game-streak-pill \{[\s\S]*?top:\s*12px/,
    );
    panel.destroy();
  });

  it("renders stats and supports dismiss", () => {
    const parent = document.createElement("div");
    const panel = createGameStreakPanel({ parent, onRefresh: () => {} });
    panel.setStats(
      {
        dayStreak: 2,
        bestStreak: 4,
        puEarnedToday: 12,
        puCapRemaining: 88,
        gamesPlayedToday: 1,
        featuredGameId: "hidden-gems",
        firstGamePlayed: true,
        perGame: {},
      },
      40
    );
    expect(panel.pill.textContent).toBe("Streak 2");
    panel.open();
    expect(panel.isOpen()).toBe(true);
    panel.close();
    expect(panel.isOpen()).toBe(false);
    panel.destroy();
  });

  it("shows shimmer placeholders while loading", () => {
    const parent = document.createElement("div");
    const panel = createGameStreakPanel({ parent, onRefresh: () => {} });
    panel.setLoading();
    panel.open();
    expect(
      panel.root.querySelector(`.${"preview-game-streak"}__shimmer-wrap`)
    ).not.toBeNull();
    panel.destroy();
  });

  it("tracks auto-peek session flag", () => {
    sessionStorage.removeItem("agent-play:game-streak-peeked");
    expect(shouldAutoPeekGameStreak()).toBe(true);
  });
});
