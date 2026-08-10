import type Redis from "ioredis";
import { generateReferralCode } from "./referral-domain.js";
import { referralCodeKey, referralOwnerKey } from "./referral-keys.js";

type ReferralOwner = {
  nodeId: string;
  createdAt: string;
};

export type EnsureReferralCodeResult = {
  readonly code: string;
};

export const ensureReferralCode = async (input: {
  redis: Redis;
  hostId: string;
  nodeId: string;
  now: string;
}): Promise<EnsureReferralCodeResult> => {
  const ownerKey = referralOwnerKey(input.hostId, input.nodeId);
  const existing = await input.redis.get(ownerKey);
  if (existing !== null && existing.length > 0) {
    return { code: existing };
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode();
    const codeKey = referralCodeKey(input.hostId, code);
    const owner: ReferralOwner = {
      nodeId: input.nodeId,
      createdAt: input.now,
    };
    const created = await input.redis.set(codeKey, JSON.stringify(owner), "NX");
    if (created !== "OK") {
      continue;
    }
    const claimed = await input.redis.set(ownerKey, code, "NX");
    if (claimed === "OK") {
      return { code };
    }
    await input.redis.del(codeKey);
    const raced = await input.redis.get(ownerKey);
    if (raced !== null && raced.length > 0) {
      return { code: raced };
    }
  }

  throw new Error("ensureReferralCode: failed to allocate unique code");
};
