/**
 * Market APW$/APU rate helpers for dual-tender amenity pricing.
 *
 * When the live Redis market rate is missing, amenity quotes still need a
 * positive rate so wallets with APW$ (and no APU) can pay.
 */

/** Econext reference economy: 0.00045 SOL/APU × 0.95 spread × $150/SOL. */
export const REFERENCE_APW_PER_APU = 0.0664875;

export const coalesceApwPerApu = (input: {
  rate: number;
  fallbackRate?: number;
}): number => {
  if (Number.isFinite(input.rate) && input.rate > 0) {
    return input.rate;
  }
  const fallback = input.fallbackRate;
  if (
    typeof fallback === "number" &&
    Number.isFinite(fallback) &&
    fallback > 0
  ) {
    return fallback;
  }
  return REFERENCE_APW_PER_APU;
};
