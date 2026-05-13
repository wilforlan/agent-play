import { describe, expect, it } from "vitest";
import {
  WALLET_BUNDLE_OFFERS,
  getWalletBundleById,
} from "./wallet-bundle-catalog.js";

describe("wallet-bundle-catalog", () => {
  it("lists four bundles with expected costs", () => {
    expect(WALLET_BUNDLE_OFFERS).toHaveLength(4);
    expect(getWalletBundleById("bundle-10")).toEqual({
      id: "bundle-10",
      powerUpsCost: 150,
      creditUsd: 10,
    });
    expect(getWalletBundleById("bundle-100")?.creditUsd).toBe(100);
    expect(getWalletBundleById("bundle-100")?.powerUpsCost).toBe(900);
  });

  it("getWalletBundleById returns undefined for unknown id", () => {
    expect(getWalletBundleById("bundle-999")).toBeUndefined();
  });
});
