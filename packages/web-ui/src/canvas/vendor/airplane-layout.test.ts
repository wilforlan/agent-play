import { describe, expect, it } from "vitest";
import { AIRPLANE_NOSE_TIP_X, AIRPLANE_ROPE_ANCHOR } from "./airplane-layout.js";

describe("airplane layout constants", () => {
  it("keeps rope anchor on the rear fuselage and nose tip forward", () => {
    expect(AIRPLANE_ROPE_ANCHOR.x).toBeLessThan(AIRPLANE_NOSE_TIP_X);
    expect(AIRPLANE_NOSE_TIP_X).toBeGreaterThan(40);
  });

  it("anchors the banner rope below the cabin midline", () => {
    expect(AIRPLANE_ROPE_ANCHOR.y).toBeGreaterThan(14);
    expect(AIRPLANE_ROPE_ANCHOR.y).toBeLessThan(28);
  });
});
