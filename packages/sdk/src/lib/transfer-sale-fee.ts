/**
 * Transfer-sale platform fee: 1.5% of listing price, capped at 100 APW$.
 * The fee is burned (never credited to any wallet).
 *
 * @public
 */

export const TRANSFER_SALE_FEE_BPS = 150;
export const TRANSFER_SALE_FEE_CAP_USD = 100;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Compute burned fee and seller net credit for a fixed-price transfer sale.
 *
 * @public
 */
export const calculateTransferSaleFee = (input: {
  priceUsd: number;
}): {
  priceUsd: number;
  feeUsd: number;
  sellerCreditUsd: number;
} => {
  const priceUsd = round2(input.priceUsd);
  const rawFee = round2((priceUsd * TRANSFER_SALE_FEE_BPS) / 10_000);
  const feeUsd = Math.min(rawFee, TRANSFER_SALE_FEE_CAP_USD);
  const sellerCreditUsd = round2(priceUsd - feeUsd);
  return { priceUsd, feeUsd, sellerCreditUsd };
};
