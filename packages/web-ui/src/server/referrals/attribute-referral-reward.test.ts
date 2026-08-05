import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  attributeReferralReward,
  recordReferralClick,
} from "./attribute-referral-reward.js";
import { createMemoryRedis } from "./memory-redis.js";
import {
  econextAccountKey,
  playerPurchasesKey,
  playerWalletKey,
  referralCodeKey,
  referralEarningsKey,
  referralSignupKey,
  referralSignupsKey,
} from "./referral-keys.js";

vi.mock("@/server/scanner/scanner-hooks", () => ({
  safeIndexPurchaseRecord: vi.fn(),
}));

const hostId = "default";
const referrerNodeId = "referrer-node";
const refereeNodeId = "referee-node";
const code = "AB12CD34";
const now = "2026-08-05T12:00:00.000Z";

describe("attributeReferralReward", () => {
  let redis: ReturnType<typeof createMemoryRedis>;

  beforeEach(() => {
    redis = createMemoryRedis();
    redis.store.set(
      referralCodeKey(hostId, code),
      JSON.stringify({ nodeId: referrerNodeId, createdAt: now }),
    );
  });

  it("credits play-world APU and econext bankable on award", async () => {
    const result = await attributeReferralReward({
      redis: redis as never,
      hostId,
      refereeNodeId,
      referralCode: code,
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      action: "recorded",
      attribution: { status: "awarded", apuAwarded: 25 },
    });

    const wallet = JSON.parse(
      redis.store.get(playerWalletKey(hostId, referrerNodeId)) ?? "{}",
    ) as { powerUps: number };
    expect(wallet.powerUps).toBe(25);

    const purchases = redis.lists.get(
      playerPurchasesKey(hostId, referrerNodeId),
    ) ?? [];
    expect(purchases).toHaveLength(1);
    expect(JSON.parse(purchases[0] ?? "{}")).toMatchObject({
      creditSource: "referral:bonus",
      powerUpsDelta: 25,
    });

    const account = JSON.parse(
      redis.store.get(econextAccountKey(hostId, referrerNodeId)) ?? "{}",
    ) as { bankableApu: number; earnedBankableCap: number };
    expect(account.bankableApu).toBe(25);
    expect(account.earnedBankableCap).toBe(25);

    expect(
      redis.store.get(referralEarningsKey(hostId, referrerNodeId, "2026-08")),
    ).toBe("25");
    expect(
      redis.lists.get(referralSignupsKey(hostId, referrerNodeId)),
    ).toHaveLength(1);
  });

  it("is idempotent for the same referee", async () => {
    await attributeReferralReward({
      redis: redis as never,
      hostId,
      refereeNodeId,
      referralCode: code,
      now,
    });
    const second = await attributeReferralReward({
      redis: redis as never,
      hostId,
      refereeNodeId,
      referralCode: code,
      now,
    });
    expect(second).toEqual({
      ok: true,
      action: "skipped",
      reason: "ALREADY_ATTRIBUTED",
    });

    const wallet = JSON.parse(
      redis.store.get(playerWalletKey(hostId, referrerNodeId)) ?? "{}",
    ) as { powerUps: number };
    expect(wallet.powerUps).toBe(25);
  });

  it("records capped without paying when monthly earnings are exhausted", async () => {
    redis.store.set(
      referralEarningsKey(hostId, referrerNodeId, "2026-08"),
      "1000",
    );

    const result = await attributeReferralReward({
      redis: redis as never,
      hostId,
      refereeNodeId,
      referralCode: code,
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      action: "recorded",
      attribution: { status: "capped", apuAwarded: 0 },
    });
    expect(redis.store.has(playerWalletKey(hostId, referrerNodeId))).toBe(
      false,
    );
    expect(
      JSON.parse(
        redis.store.get(referralSignupKey(hostId, refereeNodeId)) ?? "{}",
      ),
    ).toMatchObject({ status: "capped" });
  });

  it("skips when no referral code is provided", async () => {
    const result = await attributeReferralReward({
      redis: redis as never,
      hostId,
      refereeNodeId,
      referralCode: undefined,
      now,
    });
    expect(result).toEqual({
      ok: true,
      action: "skipped",
      reason: "NO_CODE",
    });
  });

  it("rejects self-referral as invalid", async () => {
    const result = await attributeReferralReward({
      redis: redis as never,
      hostId,
      refereeNodeId: referrerNodeId,
      referralCode: code,
      now,
    });
    expect(result).toMatchObject({
      ok: true,
      action: "recorded",
      attribution: { status: "invalid", apuAwarded: 0 },
    });
  });

  it("increments click counters", async () => {
    expect(
      await recordReferralClick({
        redis: redis as never,
        hostId,
        code,
      }),
    ).toBe(1);
    expect(
      await recordReferralClick({
        redis: redis as never,
        hostId,
        code,
      }),
    ).toBe(2);
  });
});
