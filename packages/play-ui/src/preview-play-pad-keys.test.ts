import { describe, expect, it } from "vitest";
import {
  isPlayPadTwoLetterCombo,
  playPadStickVisualAtDirectionProgress,
  resolvePlayPadInputFromKeyBuffer,
} from "./preview-play-pad-keys.js";

describe("resolvePlayPadInputFromKeyBuffer", () => {
  it("resolves attach from n", () => {
    expect(resolvePlayPadInputFromKeyBuffer("n")).toEqual({ kind: "attach" });
  });

  it("resolves cardinals from single keys", () => {
    expect(resolvePlayPadInputFromKeyBuffer("k")).toEqual({
      kind: "direction",
      direction: "left",
    });
    expect(resolvePlayPadInputFromKeyBuffer("m")).toEqual({
      kind: "direction",
      direction: "down",
    });
  });

  it("detects two-letter combo buffers", () => {
    expect(isPlayPadTwoLetterCombo("mk")).toBe(true);
    expect(isPlayPadTwoLetterCombo("m")).toBe(false);
  });

  it("prefers two-letter combos over the trailing single key", () => {
    expect(resolvePlayPadInputFromKeyBuffer("mk")).toEqual({
      kind: "direction",
      direction: "downLeft",
    });
    expect(resolvePlayPadInputFromKeyBuffer("km")).toEqual({
      kind: "direction",
      direction: "downLeft",
    });
    expect(resolvePlayPadInputFromKeyBuffer("il")).toEqual({
      kind: "direction",
      direction: "upRight",
    });
    expect(resolvePlayPadInputFromKeyBuffer("ki")).toEqual({
      kind: "direction",
      direction: "upLeft",
    });
  });
});

describe("playPadStickVisualAtDirectionProgress", () => {
  const max = 56;

  it("ends down motion at full screen-down deflection", () => {
    const v = playPadStickVisualAtDirectionProgress({
      direction: "down",
      progress: 1,
      maxOffsetPx: max,
    });
    expect(v.offsetXPx).toBe(0);
    expect(v.offsetYPx).toBe(max);
    expect(v.rotateDeg).toBe(450);
  });

  it("ends up-left diagonal with scaled offsets", () => {
    const v = playPadStickVisualAtDirectionProgress({
      direction: "upLeft",
      progress: 1,
      maxOffsetPx: max,
    });
    const d = max / Math.SQRT2;
    expect(v.offsetXPx).toBeCloseTo(-d, 5);
    expect(v.offsetYPx).toBeCloseTo(-d, 5);
  });
});
