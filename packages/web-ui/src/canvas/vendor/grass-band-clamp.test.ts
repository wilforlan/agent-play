import { describe, expect, it } from "vitest";
import { clampAgentAnchorToGrassBand } from "./grass-band-clamp.js";

describe("clampAgentAnchorToGrassBand", () => {
  it("keeps anchor when already within grass area", () => {
    expect(clampAgentAnchorToGrassBand({ y: 420, grassTopY: 300 })).toBe(420);
  });

  it("pushes anchor down to grass top when above grass", () => {
    expect(clampAgentAnchorToGrassBand({ y: 180, grassTopY: 300 })).toBe(300);
  });

  it("does nothing when grass boundary is unavailable", () => {
    expect(clampAgentAnchorToGrassBand({ y: 180, grassTopY: null })).toBe(180);
  });
});
