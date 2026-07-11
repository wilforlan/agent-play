import { describe, expect, it } from "vitest";
import { isFiniteAgentHome } from "./agent-snapshot-position.js";

describe("isFiniteAgentHome", () => {
  it("returns false for null", () => {
    expect(isFiniteAgentHome(null)).toBe(false);
  });

  it("returns false when coordinates are non-finite", () => {
    expect(isFiniteAgentHome({ x: Number.NaN, y: 1 })).toBe(false);
    expect(isFiniteAgentHome({ x: 1, y: Number.POSITIVE_INFINITY })).toBe(
      false
    );
  });

  it("returns true for finite coordinates", () => {
    expect(isFiniteAgentHome({ x: 5.4, y: 6.2 })).toBe(true);
  });
});
