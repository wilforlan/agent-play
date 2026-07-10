// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";
import {
  createGameHowToPlayPanel,
  hasSeenHowToPlay,
  markHowToPlaySeen,
  howToPlayStorageKey,
} from "./game-how-to-play.js";

describe("game how to play", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("tracks per-game first-visit in local storage", () => {
    expect(hasSeenHowToPlay("hidden-gems")).toBe(false);
    markHowToPlaySeen("hidden-gems");
    expect(hasSeenHowToPlay("hidden-gems")).toBe(true);
    expect(localStorage.getItem(howToPlayStorageKey("hidden-gems"))).toBe("1");
  });

  it("shows expanded instructions on first visit then collapses to a button", () => {
    const parent = document.createElement("div");
    const panel = createGameHowToPlayPanel({ parent });
    panel.showForGame("hidden-gems");
    expect(panel.isExpanded()).toBe(true);
    panel.dismiss();
    expect(panel.isExpanded()).toBe(false);
    expect(panel.isCollapsedButtonVisible()).toBe(true);
    expect(hasSeenHowToPlay("hidden-gems")).toBe(true);
    panel.destroy();
  });

  it("opens expanded instructions from the collapsed button on repeat visits", () => {
    markHowToPlaySeen("map-recall");
    const parent = document.createElement("div");
    const panel = createGameHowToPlayPanel({ parent });
    panel.showForGame("map-recall");
    expect(panel.isExpanded()).toBe(false);
    expect(panel.isCollapsedButtonVisible()).toBe(true);
    panel.open();
    expect(panel.isExpanded()).toBe(true);
    panel.destroy();
  });
});
