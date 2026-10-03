import { describe, expect, it } from "vitest";
import {
  REFERENCE_APW_PER_APU,
  coalesceApwPerApu,
} from "./apw-per-apu.js";
import {
  chooseEducationTender,
  quoteEducationCenterDayPassApw,
  resolveEducationTenderForPurchase,
} from "./education-access-catalog.js";

describe("coalesceApwPerApu", () => {
  it("keeps a positive live market rate", () => {
    expect(coalesceApwPerApu({ rate: 0.1 })).toBe(0.1);
  });

  it("falls back to the reference economy rate when market rate is missing", () => {
    expect(coalesceApwPerApu({ rate: 0 })).toBe(REFERENCE_APW_PER_APU);
    expect(coalesceApwPerApu({ rate: Number.NaN })).toBe(REFERENCE_APW_PER_APU);
    expect(coalesceApwPerApu({ rate: -1 })).toBe(REFERENCE_APW_PER_APU);
  });

  it("prefers an explicit fallback over the reference rate", () => {
    expect(coalesceApwPerApu({ rate: 0, fallbackRate: 0.2 })).toBe(0.2);
  });

  it("lets a zero-APU wallet pay day entry with APW$ when the market rate is missing", () => {
    const apwPerApu = coalesceApwPerApu({ rate: 0 });
    const quoteApw = quoteEducationCenterDayPassApw({ apwPerApu });
    expect(quoteApw).toBeCloseTo(5 * REFERENCE_APW_PER_APU, 8);
    expect(
      chooseEducationTender({
        powerUps: 0,
        balanceUsd: 10,
        apwPerApu,
      })
    ).toBe("apw");
    const settled = resolveEducationTenderForPurchase({
      powerUps: 0,
      balanceUsd: 10,
      apwPerApu,
    });
    expect(settled?.tender).toBe("apw");
    expect(settled?.apwCharged).toBeCloseTo(quoteApw, 8);
  });
});
