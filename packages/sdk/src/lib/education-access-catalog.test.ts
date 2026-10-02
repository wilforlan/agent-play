import { describe, expect, it } from "vitest";
import {
  EDUCATION_CENTER_DAY_PASS_APU,
  buildEducationAccessPass,
  educationCenterDayPassApuCost,
  isEducationAccessActive,
  quoteEducationCenterDayPassApw,
  resolveEducationTenderForPurchase,
  utcDayEndIso,
  utcDayKey,
} from "./education-access-catalog.js";

describe("education access catalog", () => {
  it("prices day entry at 5 APU", () => {
    expect(educationCenterDayPassApuCost()).toBe(5);
    expect(EDUCATION_CENTER_DAY_PASS_APU).toBe(5);
  });

  it("quotes APW$ from live rate", () => {
    expect(quoteEducationCenterDayPassApw({ apwPerApu: 0.1 })).toBe(0.5);
  });

  it("builds a UTC-day pass that expires at next UTC midnight", () => {
    const pass = buildEducationAccessPass({
      centerId: "foundations-hall",
      purchasedAt: "2026-10-02T15:30:00.000Z",
      tender: "apu",
      apuCost: 5,
      apwCharged: 0.5,
    });
    expect(pass.utcDay).toBe("2026-10-02");
    expect(pass.expiresAt).toBe(utcDayEndIso(new Date("2026-10-02T15:30:00.000Z")));
    expect(isEducationAccessActive(pass, new Date("2026-10-02T23:59:00.000Z"))).toBe(
      true
    );
    expect(isEducationAccessActive(pass, new Date("2026-10-03T00:00:00.000Z"))).toBe(
      false
    );
  });

  it("prefers APU tender when APU wealth is higher", () => {
    const resolved = resolveEducationTenderForPurchase({
      powerUps: 20,
      balanceUsd: 0.1,
      apwPerApu: 0.1,
    });
    expect(resolved?.tender).toBe("apu");
    expect(resolved?.apuCost).toBe(5);
  });

  it("exposes utc day helpers", () => {
    expect(utcDayKey(new Date("2026-10-02T01:00:00.000Z"))).toBe("2026-10-02");
  });
});
