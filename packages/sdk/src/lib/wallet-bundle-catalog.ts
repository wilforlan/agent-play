export type WalletBundleId =
  | "bundle-10"
  | "bundle-20"
  | "bundle-50"
  | "bundle-100";

export type WalletBundleOffer = {
  readonly id: WalletBundleId;
  readonly powerUpsCost: number;
  readonly creditUsd: number;
};

export const WALLET_BUNDLE_OFFERS: readonly WalletBundleOffer[] = [
  { id: "bundle-10", powerUpsCost: 150, creditUsd: 10 },
  { id: "bundle-20", powerUpsCost: 300, creditUsd: 20 },
  { id: "bundle-50", powerUpsCost: 500, creditUsd: 50 },
  { id: "bundle-100", powerUpsCost: 900, creditUsd: 100 },
] as const;

export const getWalletBundleById = (
  id: string
): WalletBundleOffer | undefined => {
  return WALLET_BUNDLE_OFFERS.find((o) => o.id === id);
};
