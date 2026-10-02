import type { PurchaseRecord } from "./space-content-model.js";

/**
 * Token name for redeemable power-up units (Agent Play Units).
 *
 * @public
 */
export const APU_TOKEN = "APU" as const;

type ApuItemRef = PurchaseRecord["itemRef"];

/**
 * Build a wallet transaction row for an APU credit or debit.
 *
 * @public
 */
export const buildApuWalletTransaction = (input: {
  id: string;
  playerId: string;
  spaceId: string;
  delta: number;
  at: string;
  creditSource?: string;
  debitSource?: string;
  counterpartyNodeId?: string;
  detail?: string;
  itemRef: ApuItemRef;
}): PurchaseRecord => {
  const amount = Math.abs(Math.trunc(input.delta));
  const isCredit = input.delta > 0;
  return {
    id: input.id,
    playerId: input.playerId,
    spaceId: input.spaceId,
    amenityKind: isCredit ? "apu_credit" : "apu_debit",
    itemRef: input.itemRef,
    at: input.at,
    detail: input.detail,
    powerUpsEarned: isCredit ? amount : undefined,
    powerUpsSpent: isCredit ? undefined : amount,
    powerUpsDelta: input.delta,
    creditSource: input.creditSource,
    debitSource: input.debitSource,
    counterpartyNodeId: input.counterpartyNodeId,
    token: APU_TOKEN,
  };
};

/**
 * APU fields appended to amenity purchase audit rows when USD is spent
 * and power-ups are minted.
 *
 * @public
 */
export const buildAmenityPurchaseApuFields = (input: {
  amenityKind: "shop" | "supermarket" | "car_wash";
  spaceId: string;
  earnedPowerUps: number;
}): Pick<
  PurchaseRecord,
  | "powerUpsEarned"
  | "powerUpsDelta"
  | "creditSource"
  | "debitSource"
  | "token"
> => ({
  powerUpsEarned: input.earnedPowerUps,
  powerUpsDelta: input.earnedPowerUps,
  creditSource: `amenity:${input.amenityKind}:${input.spaceId}`,
  debitSource: "wallet:usd",
  token: APU_TOKEN,
});

/**
 * APU fields for wallet bundle redemption rows.
 *
 * @public
 */
export const buildWalletBundleApuFields = (input: {
  bundleId: string;
  powerUpsCost: number;
}): Pick<
  PurchaseRecord,
  | "powerUpsSpent"
  | "powerUpsDelta"
  | "creditSource"
  | "debitSource"
  | "token"
> => ({
  powerUpsSpent: input.powerUpsCost,
  powerUpsDelta: -input.powerUpsCost,
  debitSource: "wallet:apu",
  creditSource: `wallet:usd:bundle:${input.bundleId}`,
  token: APU_TOKEN,
});

/**
 * Fields for Maple Ave arcade day/week pass rows settled in APU or APW$.
 *
 * @public
 */
export const buildArcadePassPurchaseFields = (input: {
  plan: "day" | "week";
  tender: "apu" | "apw";
  apuCost: number;
  apwCharged: number;
}): Pick<
  PurchaseRecord,
  | "priceUsd"
  | "powerUpsSpent"
  | "powerUpsDelta"
  | "debitSource"
  | "creditSource"
  | "token"
> => {
  if (input.tender === "apu") {
    return {
      priceUsd: input.apwCharged > 0 ? input.apwCharged : undefined,
      powerUpsSpent: input.apuCost,
      powerUpsDelta: -input.apuCost,
      debitSource: "wallet:apu",
      creditSource: `arcade:pass:${input.plan}`,
      token: APU_TOKEN,
    };
  }
  return {
    priceUsd: input.apwCharged,
    debitSource: "wallet:usd",
    creditSource: `arcade:pass:${input.plan}`,
    token: "USD",
  };
};

/**
 * Fields for Elm Street educational center day-entry rows settled in APU or APW$.
 *
 * @public
 */
export const buildEducationPassPurchaseFields = (input: {
  centerId: string;
  utcDay: string;
  tender: "apu" | "apw";
  apuCost: number;
  apwCharged: number;
}): Pick<
  PurchaseRecord,
  | "priceUsd"
  | "powerUpsSpent"
  | "powerUpsDelta"
  | "debitSource"
  | "creditSource"
  | "token"
> => {
  if (input.tender === "apu") {
    return {
      priceUsd: input.apwCharged > 0 ? input.apwCharged : undefined,
      powerUpsSpent: input.apuCost,
      powerUpsDelta: -input.apuCost,
      debitSource: "wallet:apu",
      creditSource: `education:pass:${input.centerId}:${input.utcDay}`,
      token: APU_TOKEN,
    };
  }
  return {
    priceUsd: input.apwCharged,
    debitSource: "wallet:usd",
    creditSource: `education:pass:${input.centerId}:${input.utcDay}`,
    token: "USD",
  };
};
