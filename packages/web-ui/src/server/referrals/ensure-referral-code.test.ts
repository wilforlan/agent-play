import { beforeEach, describe, expect, it } from "vitest";
import { ensureReferralCode } from "./ensure-referral-code.js";
import { createMemoryRedis } from "./memory-redis.js";
import { referralCodeKey, referralOwnerKey } from "./referral-keys.js";

const hostId = "default";
const nodeId = "citizen-node-abc";
const now = "2026-08-10T08:00:00.000Z";

describe("ensureReferralCode", () => {
  let redis: ReturnType<typeof createMemoryRedis>;

  beforeEach(() => {
    redis = createMemoryRedis();
  });

  it("allocates a stable code for a node and returns it again", async () => {
    const first = await ensureReferralCode({
      redis: redis as never,
      hostId,
      nodeId,
      now,
    });
    expect(first.code).toMatch(/^[A-Z0-9]{8}$/);
    expect(redis.store.get(referralOwnerKey(hostId, nodeId))).toBe(first.code);
    expect(JSON.parse(redis.store.get(referralCodeKey(hostId, first.code)) ?? "{}")).toMatchObject({
      nodeId,
    });

    const second = await ensureReferralCode({
      redis: redis as never,
      hostId,
      nodeId,
      now: "2026-08-11T08:00:00.000Z",
    });
    expect(second.code).toBe(first.code);
  });
});
