import { describe, expect, it } from "vitest";
import {
  ARCADE_DAY_PASS_APU,
  ARCADE_DAY_PASS_HOURS,
  ARCADE_WEEK_DISCOUNT,
  ARCADE_WEEK_PASS_DAYS,
  arcadeDayPassApuCost,
  arcadePassApuCost,
  arcadeWeekPassApuCost,
  buildArcadeAccessPass,
  chooseArcadeTender,
  isArcadeAccessActive,
  quoteArcadePassApw,
  resolveArcadeTenderForPurchase,
  type ArcadeAccessPass,
} from "./arcade-access-catalog.js";

describe("arcade-access-catalog", () => {
  it("prices day pass at 25 APU for 24 hours", () => {
    expect(ARCADE_DAY_PASS_APU).toBe(25);
    expect(ARCADE_DAY_PASS_HOURS).toBe(24);
    expect(arcadeDayPassApuCost()).toBe(25);
  });

  it("prices week pass at 20% off seven day passes", () => {
    expect(ARCADE_WEEK_PASS_DAYS).toBe(7);
    expect(ARCADE_WEEK_DISCOUNT).toBe(0.2);
    expect(arcadeWeekPassApuCost()).toBe(140);
    expect(arcadePassApuCost("day")).toBe(25);
    expect(arcadePassApuCost("week")).toBe(140);
  });

  it("quotes APW$ from live apwPerApu rate", () => {
    expect(quoteArcadePassApw({ plan: "day", apwPerApu: 0.0664875 })).toBe(
      1.6621875
    );
    expect(quoteArcadePassApw({ plan: "week", apwPerApu: 0.0664875 })).toBe(
      9.30825
    );
    expect(quoteArcadePassApw({ plan: "day", apwPerApu: 0 })).toBe(0);
  });

  it("chooses APU tender when APU wealth is higher", () => {
    expect(
      chooseArcadeTender({
        powerUps: 200,
        balanceUsd: 5,
        apwPerApu: 0.0664875,
      })
    ).toBe("apu");
  });

  it("chooses APW tender when cash wealth is higher", () => {
    expect(
      chooseArcadeTender({
        powerUps: 10,
        balanceUsd: 10,
        apwPerApu: 0.0664875,
      })
    ).toBe("apw");
  });

  it("forces APU when rate is unavailable", () => {
    expect(
      chooseArcadeTender({
        powerUps: 10,
        balanceUsd: 100,
        apwPerApu: 0,
      })
    ).toBe("apu");
  });

  it("falls back when preferred tender cannot cover fee", () => {
    expect(
      resolveArcadeTenderForPurchase({
        plan: "day",
        powerUps: 10,
        balanceUsd: 10,
        apwPerApu: 0.0664875,
      })
    ).toEqual({ tender: "apw", apuCost: 25, apwCharged: 1.6621875 });

    expect(
      resolveArcadeTenderForPurchase({
        plan: "day",
        powerUps: 30,
        balanceUsd: 0.5,
        apwPerApu: 0.0664875,
      })
    ).toEqual({ tender: "apu", apuCost: 25, apwCharged: 1.6621875 });

    expect(
      resolveArcadeTenderForPurchase({
        plan: "day",
        powerUps: 10,
        balanceUsd: 0.5,
        apwPerApu: 0.0664875,
      })
    ).toBeNull();
  });

  it("builds and validates an access pass expiry", () => {
    const purchasedAt = "2026-06-10T12:00:00.000Z";
    const pass = buildArcadeAccessPass({
      plan: "day",
      purchasedAt,
      tender: "apu",
      apuCost: 25,
      apwCharged: 1.66,
    });
    expect(pass.expiresAt).toBe("2026-06-11T12:00:00.000Z");
    expect(isArcadeAccessActive(pass, new Date("2026-06-11T11:59:59.000Z"))).toBe(
      true
    );
    expect(isArcadeAccessActive(pass, new Date("2026-06-11T12:00:00.000Z"))).toBe(
      false
    );

    const week: ArcadeAccessPass = buildArcadeAccessPass({
      plan: "week",
      purchasedAt,
      tender: "apw",
      apuCost: 140,
      apwCharged: 9.3,
    });
    expect(week.expiresAt).toBe("2026-06-17T12:00:00.000Z");
  });
});
