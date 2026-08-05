import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import {
  PurchaseRecordSchema,
  PlayerWalletSchema,
  createInitialPlayerWallet,
  type PlayerWallet,
  type PurchaseRecord,
} from "@agent-play/sdk";
import { safeIndexPurchaseRecord } from "@/server/scanner/scanner-hooks";
import {
  applyReferralBankableCredit,
  decideReferralReward,
  monthKeyUtc,
  REFERRAL_CREDIT_SOURCE,
  type ReferralAttribution,
} from "./referral-domain.js";
import {
  econextAccountKey,
  econextLedgerKey,
  playerPurchasesKey,
  playerWalletKey,
  referralClicksKey,
  referralCodeKey,
  referralEarningsKey,
  referralSignupKey,
  referralSignupsKey,
} from "./referral-keys.js";

const LEDGER_MAX = 500;
const PURCHASES_MAX = 500;
const REFERRAL_SIGNUPS_MAX = 200;

type EconextAccount = {
  nodeId: string;
  bankableApu: number;
  earnedBankableCap: number;
  bankableIncludesLockedPrincipal: boolean;
  solBalanceLamports: number;
  createdAt: string;
  updatedAt: string;
};

type ReferralOwner = {
  nodeId: string;
  createdAt: string;
};

export type AttributeReferralRewardResult =
  | { ok: true; action: "skipped"; reason: string }
  | { ok: true; action: "recorded"; attribution: ReferralAttribution }
  | { ok: false; error: string };

const parseOwner = (raw: string | null): string | null => {
  if (raw === null || raw.length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ReferralOwner;
    if (typeof parsed.nodeId === "string" && parsed.nodeId.length > 0) {
      return parsed.nodeId;
    }
    return null;
  } catch {
    return null;
  }
};

const parseAccount = (raw: string | null, nodeId: string, now: string): EconextAccount => {
  if (raw !== null && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as EconextAccount;
      if (parsed.nodeId === nodeId) {
        return {
          nodeId: parsed.nodeId,
          bankableApu: Number(parsed.bankableApu) || 0,
          earnedBankableCap: Number(parsed.earnedBankableCap) || 0,
          bankableIncludesLockedPrincipal:
            parsed.bankableIncludesLockedPrincipal !== false,
          solBalanceLamports: Number(parsed.solBalanceLamports) || 0,
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt,
        };
      }
    } catch {
      // fall through to create
    }
  }
  return {
    nodeId,
    bankableApu: 0,
    earnedBankableCap: 0,
    bankableIncludesLockedPrincipal: true,
    solBalanceLamports: 0,
    createdAt: now,
    updatedAt: now,
  };
};

const readWallet = async (input: {
  redis: Redis;
  hostId: string;
  playerId: string;
  now: string;
}): Promise<PlayerWallet> => {
  const raw = await input.redis.get(
    playerWalletKey(input.hostId, input.playerId),
  );
  if (raw !== null && raw.length > 0) {
    try {
      return PlayerWalletSchema.parse(JSON.parse(raw));
    } catch {
      // fall through
    }
  }
  return createInitialPlayerWallet({
    playerId: input.playerId,
    now: input.now,
  });
};

const creditPlayWorldApu = async (input: {
  redis: Redis;
  hostId: string;
  referrerNodeId: string;
  apuAwarded: number;
  now: string;
  purchaseId: string;
  refereeNodeId: string;
}): Promise<PurchaseRecord> => {
  const walletKey = playerWalletKey(input.hostId, input.referrerNodeId);
  const maxAttempts = 5;
  let wallet = await readWallet({
    redis: input.redis,
    hostId: input.hostId,
    playerId: input.referrerNodeId,
    now: input.now,
  });

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await input.redis.watch(walletKey);
    wallet = await readWallet({
      redis: input.redis,
      hostId: input.hostId,
      playerId: input.referrerNodeId,
      now: input.now,
    });
    const next: PlayerWallet = {
      ...wallet,
      powerUps: (wallet.powerUps ?? 0) + input.apuAwarded,
      updatedAt: input.now,
    };
    const exec = await input.redis
      .multi()
      .set(walletKey, JSON.stringify(next))
      .exec();
    if (exec !== null) {
      wallet = next;
      break;
    }
    if (attempt === maxAttempts - 1) {
      throw new Error("creditPlayWorldApu: lost CAS retries");
    }
  }

  const purchase = PurchaseRecordSchema.parse({
    id: input.purchaseId,
    playerId: input.referrerNodeId,
    spaceId: "referral",
    amenityKind: "apu_credit",
    itemRef: { kind: "apu", id: input.purchaseId },
    at: input.now,
    detail: `Referral bonus for ${input.refereeNodeId}`,
    powerUpsDelta: input.apuAwarded,
    creditSource: REFERRAL_CREDIT_SOURCE,
    token: "APU",
  });

  const purchasesKey = playerPurchasesKey(input.hostId, input.referrerNodeId);
  await input.redis
    .multi()
    .lpush(purchasesKey, JSON.stringify(purchase))
    .ltrim(purchasesKey, 0, PURCHASES_MAX - 1)
    .exec();
  safeIndexPurchaseRecord({
    redis: input.redis,
    hostId: input.hostId,
    record: purchase,
  });
  return purchase;
};

const creditEconextBankable = async (input: {
  redis: Redis;
  hostId: string;
  referrerNodeId: string;
  apuAwarded: number;
  now: string;
  refereeNodeId: string;
}): Promise<void> => {
  const accountKey = econextAccountKey(input.hostId, input.referrerNodeId);
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await input.redis.watch(accountKey);
    const raw = await input.redis.get(accountKey);
    const account = parseAccount(raw, input.referrerNodeId, input.now);
    const credited = applyReferralBankableCredit({
      bankableApu: account.bankableApu,
      earnedBankableCap: account.earnedBankableCap,
      apuAwarded: input.apuAwarded,
    });
    const updated: EconextAccount = {
      ...account,
      bankableApu: credited.bankableApu,
      earnedBankableCap: credited.earnedBankableCap,
      updatedAt: input.now,
    };
    const ledgerEntry = {
      id: randomUUID(),
      nodeId: input.referrerNodeId,
      kind: "referral_bonus",
      at: input.now,
      apuDelta: input.apuAwarded,
      detail: `Referral bonus for ${input.refereeNodeId}`,
      receiptId: randomUUID(),
      referenceId: input.refereeNodeId,
    };
    const ledgerKey = econextLedgerKey(input.hostId, input.referrerNodeId);
    const exec = await input.redis
      .multi()
      .set(accountKey, JSON.stringify(updated))
      .lpush(ledgerKey, JSON.stringify(ledgerEntry))
      .ltrim(ledgerKey, 0, LEDGER_MAX - 1)
      .exec();
    if (exec !== null) {
      return;
    }
  }
  throw new Error("creditEconextBankable: lost CAS retries");
};

export const attributeReferralReward = async (input: {
  redis: Redis;
  hostId: string;
  refereeNodeId: string;
  referralCode: string | null | undefined;
  now: string;
}): Promise<AttributeReferralRewardResult> => {
  const signupKey = referralSignupKey(input.hostId, input.refereeNodeId);
  const existingRaw = await input.redis.get(signupKey);
  const existingAttribution = existingRaw !== null && existingRaw.length > 0;

  const resolveReferrerNodeId = async (code: string): Promise<string | null> =>
    parseOwner(await input.redis.get(referralCodeKey(input.hostId, code)));

  // Synchronous decide needs sync resolve — preload via closure after peek.
  // We resolve inside decide by reading once per call; use a sync cache.
  const referrerCache = new Map<string, string | null>();
  const codesToCheck = [input.referralCode]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toUpperCase());
  for (const code of codesToCheck) {
    if (code.length === 8) {
      referrerCache.set(code, await resolveReferrerNodeId(code));
    }
  }

  let monthApuEarned = 0;
  const cachedReferrer = [...referrerCache.values()].find(
    (value): value is string => typeof value === "string",
  );
  if (cachedReferrer !== undefined) {
    const earningsRaw = await input.redis.get(
      referralEarningsKey(
        input.hostId,
        cachedReferrer,
        monthKeyUtc(input.now),
      ),
    );
    const parsed = Number.parseInt(earningsRaw ?? "0", 10);
    monthApuEarned = Number.isFinite(parsed) ? parsed : 0;
  }

  const decision = decideReferralReward({
    referralCode: input.referralCode,
    refereeNodeId: input.refereeNodeId,
    resolveReferrerNodeId: (code) => referrerCache.get(code) ?? null,
    existingAttribution,
    monthApuEarned,
  });

  if (decision.action === "skip") {
    return { ok: true, action: "skipped", reason: decision.reason };
  }

  const attribution: ReferralAttribution = {
    referrerNodeId: decision.referrerNodeId,
    referralCode: decision.referralCode,
    refereeNodeId: input.refereeNodeId,
    at: input.now,
    apuAwarded: decision.apuAwarded,
    status: decision.status,
  };

  const claimed = await input.redis.set(
    signupKey,
    JSON.stringify(attribution),
    "NX",
  );
  if (claimed !== "OK") {
    return { ok: true, action: "skipped", reason: "ALREADY_ATTRIBUTED" };
  }

  if (decision.status === "awarded" && decision.referrerNodeId !== null) {
    try {
      await creditPlayWorldApu({
        redis: input.redis,
        hostId: input.hostId,
        referrerNodeId: decision.referrerNodeId,
        apuAwarded: decision.apuAwarded,
        now: input.now,
        purchaseId: randomUUID(),
        refereeNodeId: input.refereeNodeId,
      });
      await creditEconextBankable({
        redis: input.redis,
        hostId: input.hostId,
        referrerNodeId: decision.referrerNodeId,
        apuAwarded: decision.apuAwarded,
        now: input.now,
        refereeNodeId: input.refereeNodeId,
      });
      await input.redis.incrby(
        referralEarningsKey(
          input.hostId,
          decision.referrerNodeId,
          monthKeyUtc(input.now),
        ),
        decision.apuAwarded,
      );
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "reward_failed",
      };
    }
  }

  if (decision.referrerNodeId !== null) {
    const listKey = referralSignupsKey(input.hostId, decision.referrerNodeId);
    await input.redis
      .multi()
      .lpush(listKey, JSON.stringify(attribution))
      .ltrim(listKey, 0, REFERRAL_SIGNUPS_MAX - 1)
      .exec();
  }

  return { ok: true, action: "recorded", attribution };
};

export const recordReferralClick = async (input: {
  redis: Redis;
  hostId: string;
  code: string;
}): Promise<number> =>
  input.redis.incr(referralClicksKey(input.hostId, input.code));
