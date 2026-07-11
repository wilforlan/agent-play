import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARKING_RATES_USD,
  PARKING_DURATION_TIERS,
  effectiveHourlyRateUsd,
} from "./parking-pricing.js";

describe("DEFAULT_PARKING_RATES_USD", () => {
  it("defines a positive rate for every tier", () => {
    for (const tier of PARKING_DURATION_TIERS) {
      expect(DEFAULT_PARKING_RATES_USD[tier]).toBeGreaterThan(0);
    }
  });

  it("orders rates ascending by commitment length", () => {
    const ordered = [...PARKING_DURATION_TIERS];
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1];
      const cur = ordered[i];
      if (prev === undefined || cur === undefined) {
        throw new Error("tier");
      }
      expect(DEFAULT_PARKING_RATES_USD[cur]).toBeGreaterThan(
        DEFAULT_PARKING_RATES_USD[prev]
      );
    }
  });

  it("keeps short tiers affordable on the default wallet", () => {
    expect(DEFAULT_PARKING_RATES_USD["1h"]).toBeLessThanOrEqual(10);
  });

  it("discounts longer tiers on an effective hourly basis", () => {
    const hourly1h = effectiveHourlyRateUsd("1h");
    const hourly1d = effectiveHourlyRateUsd("1d");
    const hourly1y = effectiveHourlyRateUsd("1y");
    expect(hourly1d).toBeLessThan(hourly1h);
    expect(hourly1y).toBeLessThan(hourly1d);
  });
});
