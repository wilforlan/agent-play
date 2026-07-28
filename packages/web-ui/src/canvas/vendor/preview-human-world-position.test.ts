// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearHumanWorldPosition,
  loadHumanWorldPosition,
  PREVIEW_HUMAN_WORLD_POS_STORAGE_KEY,
  saveHumanWorldPosition,
} from "./preview-human-world-position.js";

describe("preview human world position", () => {
  afterEach(() => {
    localStorage.removeItem(PREVIEW_HUMAN_WORLD_POS_STORAGE_KEY);
    clearHumanWorldPosition();
  });

  it("returns null when nothing is stored", () => {
    expect(loadHumanWorldPosition({ sid: "s1" })).toBeNull();
  });

  it("restores a position only when the session id matches", () => {
    saveHumanWorldPosition({ sid: "s1", x: 12.5, y: -3 });
    expect(loadHumanWorldPosition({ sid: "s1" })).toEqual({ x: 12.5, y: -3 });
    expect(loadHumanWorldPosition({ sid: "other" })).toBeNull();
    expect(loadHumanWorldPosition({ sid: null })).toBeNull();
  });

  it("ignores non-finite coordinates", () => {
    localStorage.setItem(
      PREVIEW_HUMAN_WORLD_POS_STORAGE_KEY,
      JSON.stringify({ sid: "s1", x: Number.POSITIVE_INFINITY, y: 1 })
    );
    expect(loadHumanWorldPosition({ sid: "s1" })).toBeNull();
  });

  it("round-trips through localStorage after a clear", () => {
    saveHumanWorldPosition({ sid: "abc", x: 0, y: 4 });
    clearHumanWorldPosition();
    expect(loadHumanWorldPosition({ sid: "abc" })).toEqual({ x: 0, y: 4 });
  });
});
