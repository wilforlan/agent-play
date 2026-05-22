import { describe, expect, it } from "vitest";
import {
  TALK_PRICE_PER_60S_USD,
  TALK_PRICE_PER_SECOND_USD,
  costForSeconds,
} from "./talk-billing.js";

describe("talk-billing", () => {
  it("charges exactly 1.50 for 60 whole seconds", () => {
    expect(costForSeconds(60)).toBe(TALK_PRICE_PER_60S_USD);
  });

  it("uses micro-dollar rounding per whole second", () => {
    expect(costForSeconds(1)).toBe(0.025);
    expect(costForSeconds(10)).toBe(0.25);
    expect(costForSeconds(40)).toBe(1);
  });

  it("is monotonic for each added second", () => {
    let prev = 0;
    for (let s = 1; s <= 120; s += 1) {
      const next = costForSeconds(s);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });

  it("returns zero for non-positive or non-finite seconds", () => {
    expect(costForSeconds(0)).toBe(0);
    expect(costForSeconds(-1)).toBe(0);
    expect(costForSeconds(Number.NaN)).toBe(0);
  });

  it("floors fractional seconds input before billing", () => {
    expect(costForSeconds(10.9)).toBe(costForSeconds(10));
  });

  it("exposes stable per-second rate constant", () => {
    expect(TALK_PRICE_PER_SECOND_USD).toBe(0.025);
  });
});
