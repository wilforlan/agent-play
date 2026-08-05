import { describe, expect, it } from "vitest";
import {
  REFERRAL_CREDIT_SOURCE,
  REFERRAL_MONTHLY_APU_CAP,
  REFERRAL_REWARD_APU,
  applyReferralBankableCredit,
  decideReferralReward,
  monthKeyUtc,
  monthlyApuRemaining,
  parseReferralCode,
} from "./referral-domain.js";

describe("referral domain (agent-play)", () => {
  it("mirrors reward constants", () => {
    expect(REFERRAL_REWARD_APU).toBe(25);
    expect(REFERRAL_MONTHLY_APU_CAP).toBe(1000);
    expect(REFERRAL_CREDIT_SOURCE).toBe("referral:bonus");
  });

  it("parses valid referral codes", () => {
    expect(parseReferralCode("ab12cd34")).toBe("AB12CD34");
    expect(parseReferralCode("nope")).toBeNull();
  });

  it("computes monthly remaining and UTC month keys", () => {
    expect(monthlyApuRemaining(975)).toBe(25);
    expect(monthKeyUtc("2026-08-05T12:00:00.000Z")).toBe("2026-08");
  });

  it("awards under cap and caps when exhausted", () => {
    expect(
      decideReferralReward({
        referralCode: "AB12CD34",
        refereeNodeId: "node-b",
        resolveReferrerNodeId: () => "node-a",
        existingAttribution: false,
        monthApuEarned: 0,
      }).action,
    ).toBe("record");

    const capped = decideReferralReward({
      referralCode: "AB12CD34",
      refereeNodeId: "node-b",
      resolveReferrerNodeId: () => "node-a",
      existingAttribution: false,
      monthApuEarned: 1000,
    });
    expect(capped).toMatchObject({
      action: "record",
      status: "capped",
      apuAwarded: 0,
    });
  });

  it("bumps bankable and earnedBankableCap together", () => {
    expect(
      applyReferralBankableCredit({
        bankableApu: 10,
        earnedBankableCap: 10,
        apuAwarded: 25,
      }),
    ).toEqual({ bankableApu: 35, earnedBankableCap: 35 });
  });
});
