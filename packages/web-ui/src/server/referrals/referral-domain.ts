export const REFERRAL_REWARD_APU = 25;
export const REFERRAL_MONTHLY_APU_CAP = 1000;
export const REFERRAL_CREDIT_SOURCE = "referral:bonus" as const;
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_SESSION_STORAGE_KEY = "agent-play:referral-code";

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{8}$/;

export type ReferralAttributionStatus = "awarded" | "capped" | "invalid";

export type ReferralAttribution = {
  readonly referrerNodeId: string | null;
  readonly referralCode: string;
  readonly refereeNodeId: string;
  readonly at: string;
  readonly apuAwarded: number;
  readonly status: ReferralAttributionStatus;
};

export const normalizeReferralCode = (raw: string): string =>
  raw.trim().toUpperCase();

export const isValidReferralCode = (code: string): boolean =>
  REFERRAL_CODE_PATTERN.test(code);

export const parseReferralCode = (
  raw: string | null | undefined,
): string | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  const normalized = normalizeReferralCode(raw);
  if (!isValidReferralCode(normalized)) {
    return null;
  }
  return normalized;
};

export const monthKeyUtc = (isoNow: string): string => {
  const date = new Date(isoNow);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${String(year)}-${month}`;
};

export const monthlyApuRemaining = (monthApuEarned: number): number =>
  Math.max(0, REFERRAL_MONTHLY_APU_CAP - Math.max(0, monthApuEarned));

export type ReferralRewardDecision =
  | {
      action: "skip";
      reason: "NO_CODE" | "INVALID_CODE" | "ALREADY_ATTRIBUTED";
    }
  | {
      action: "record";
      status: ReferralAttributionStatus;
      referrerNodeId: string | null;
      referralCode: string;
      apuAwarded: number;
    };

export const decideReferralReward = (input: {
  referralCode: string | null | undefined;
  refereeNodeId: string;
  resolveReferrerNodeId: (code: string) => string | null;
  existingAttribution: boolean;
  monthApuEarned: number;
}): ReferralRewardDecision => {
  if (
    input.referralCode === null ||
    input.referralCode === undefined ||
    input.referralCode.trim().length === 0
  ) {
    return { action: "skip", reason: "NO_CODE" };
  }

  const code = parseReferralCode(input.referralCode);
  if (code === null) {
    return { action: "skip", reason: "INVALID_CODE" };
  }

  if (input.existingAttribution) {
    return { action: "skip", reason: "ALREADY_ATTRIBUTED" };
  }

  const referrerNodeId = input.resolveReferrerNodeId(code);
  if (referrerNodeId === null) {
    return {
      action: "record",
      status: "invalid",
      referrerNodeId: null,
      referralCode: code,
      apuAwarded: 0,
    };
  }

  if (referrerNodeId === input.refereeNodeId) {
    return {
      action: "record",
      status: "invalid",
      referrerNodeId,
      referralCode: code,
      apuAwarded: 0,
    };
  }

  if (monthlyApuRemaining(input.monthApuEarned) < REFERRAL_REWARD_APU) {
    return {
      action: "record",
      status: "capped",
      referrerNodeId,
      referralCode: code,
      apuAwarded: 0,
    };
  }

  return {
    action: "record",
    status: "awarded",
    referrerNodeId,
    referralCode: code,
    apuAwarded: REFERRAL_REWARD_APU,
  };
};

export const applyReferralBankableCredit = (input: {
  bankableApu: number;
  earnedBankableCap: number;
  apuAwarded: number;
}): { bankableApu: number; earnedBankableCap: number } => {
  if (input.apuAwarded <= 0) {
    return {
      bankableApu: input.bankableApu,
      earnedBankableCap: input.earnedBankableCap,
    };
  }
  return {
    bankableApu: input.bankableApu + input.apuAwarded,
    earnedBankableCap: input.earnedBankableCap + input.apuAwarded,
  };
};
