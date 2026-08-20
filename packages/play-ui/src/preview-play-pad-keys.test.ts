import { describe, expect, it } from "vitest";
import {
  isPlayPadModifierChord,
  isPlayPadTwoLetterCombo,
  PLAY_PAD_HELP_ROWS,
  playPadStickVisualAtDirectionProgress,
  resolvePlayPadInputFromKeyBuffer,
} from "./preview-play-pad-keys.js";

describe("isPlayPadModifierChord", () => {
  const base = {
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
  };

  it("requires Shift+Ctrl without Alt or Meta", () => {
    expect(isPlayPadModifierChord({ ...base, shiftKey: true, ctrlKey: true })).toBe(
      true,
    );
    expect(isPlayPadModifierChord({ ...base, shiftKey: true })).toBe(false);
    expect(isPlayPadModifierChord({ ...base, ctrlKey: true })).toBe(false);
    expect(isPlayPadModifierChord(base)).toBe(false);
    expect(
      isPlayPadModifierChord({
        ...base,
        shiftKey: true,
        ctrlKey: true,
        altKey: true,
      }),
    ).toBe(false);
    expect(
      isPlayPadModifierChord({
        ...base,
        shiftKey: true,
        ctrlKey: true,
        metaKey: true,
      }),
    ).toBe(false);
  });
});

describe("PLAY_PAD_HELP_ROWS", () => {
  it("labels every binding as Shift+Ctrl plus the key", () => {
    expect(PLAY_PAD_HELP_ROWS.length).toBeGreaterThan(0);
    for (const row of PLAY_PAD_HELP_ROWS) {
      expect(row.keys.startsWith("Shift+Ctrl+")).toBe(true);
    }
    expect(PLAY_PAD_HELP_ROWS[0]?.keys).toBe("Shift+Ctrl+N");
  });
});

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
