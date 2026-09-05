import { describe, expect, it } from "vitest";
import { apwFromApu } from "./scanner-head-resolve.js";

describe("apwFromApu", () => {
  it("multiplies APU by the convert rate", () => {
    expect(apwFromApu({ apuAmount: 100, apwPerApu: 0.0664875 })).toBeCloseTo(
      6.64875,
      8,
    );
  });

  it("returns zero for missing rate or amount", () => {
    expect(apwFromApu({ apuAmount: 100, apwPerApu: 0 })).toBe(0);
    expect(apwFromApu({ apuAmount: 0, apwPerApu: 0.0664875 })).toBe(0);
  });
});
