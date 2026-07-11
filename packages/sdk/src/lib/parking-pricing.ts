import type { ParkingDurationTier } from "./parking-ownership.js";

export const PARKING_DURATION_TIERS = [
  "1h",
  "12h",
  "1d",
  "3d",
  "7d",
  "1mo",
  "3mo",
  "1y",
  "forever",
] as const satisfies readonly ParkingDurationTier[];

const HOURS_PER_TIER: Record<ParkingDurationTier, number | null> = {
  "1h": 1,
  "12h": 12,
  "1d": 24,
  "3d": 72,
  "7d": 168,
  "1mo": 24 * 30,
  "3mo": 24 * 90,
  "1y": 24 * 365,
  forever: null,
};

export const DEFAULT_PARKING_RATES_USD: Record<ParkingDurationTier, number> = {
  "1h": 0.75,
  "12h": 3.5,
  "1d": 5,
  "3d": 12,
  "7d": 22,
  "1mo": 65,
  "3mo": 165,
  "1y": 480,
  forever: 750,
};

export const effectiveHourlyRateUsd = (tier: ParkingDurationTier): number => {
  const hours = HOURS_PER_TIER[tier];
  if (hours === null) {
    return DEFAULT_PARKING_RATES_USD.forever;
  }
  return DEFAULT_PARKING_RATES_USD[tier] / hours;
};

export const computeParkingExpiresAt = (input: {
  tier: ParkingDurationTier;
  purchasedAtIso: string;
}): string | null => {
  if (input.tier === "forever") {
    return null;
  }
  const hours = HOURS_PER_TIER[input.tier];
  if (hours === null) {
    return null;
  }
  const purchasedAt = new Date(input.purchasedAtIso);
  if (Number.isNaN(purchasedAt.getTime())) {
    throw new Error("computeParkingExpiresAt: invalid purchasedAtIso");
  }
  return new Date(purchasedAt.getTime() + hours * 60 * 60 * 1000).toISOString();
};

export const isParkingOccupantActive = (input: {
  expiresAt: string | null;
  nowIso: string;
}): boolean => {
  if (input.expiresAt === null) {
    return true;
  }
  const expires = new Date(input.expiresAt).getTime();
  const now = new Date(input.nowIso).getTime();
  if (Number.isNaN(expires) || Number.isNaN(now)) {
    return false;
  }
  return expires > now;
};
