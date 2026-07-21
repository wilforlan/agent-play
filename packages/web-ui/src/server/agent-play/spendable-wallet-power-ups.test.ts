import { describe, expect, it } from "vitest";
import {
  econextAccountVaultsKey,
  spendablePowerUps,
  sumActiveLockedApuFromVaultHashValues,
  toSpendablePlayerWallet,
} from "./spendable-wallet-power-ups.js";

describe("spendable wallet power-ups", () => {
  it("builds the econext vaults redis key", () => {
    expect(econextAccountVaultsKey("default", "node-a")).toBe(
      "econext:default:account:node-a:vaults"
    );
  });

  it("returns full powerUps when nothing is locked", () => {
    expect(spendablePowerUps({ powerUps: 1000, lockedApu: 0 })).toBe(1000);
  });

  it("subtracts active savings locks at runtime", () => {
    expect(spendablePowerUps({ powerUps: 1000, lockedApu: 200 })).toBe(800);
  });

  it("never goes negative when locks exceed powerUps", () => {
    expect(spendablePowerUps({ powerUps: 100, lockedApu: 250 })).toBe(0);
  });

  it("sums only active vault lockedApu from hash values", () => {
    const locked = sumActiveLockedApuFromVaultHashValues([
      JSON.stringify({ status: "active", lockedApu: 200 }),
      JSON.stringify({ status: "closed", lockedApu: 500 }),
      JSON.stringify({ status: "active", lockedApu: 50 }),
      "not-json",
    ]);
    expect(locked).toBe(250);
  });

  it("applies spendable powerUps onto a wallet view without mutating other fields", () => {
    const wallet = toSpendablePlayerWallet({
      wallet: {
        playerId: "p1",
        balanceUsd: 10,
        powerUps: 1000,
        currency: "USD",
        updatedAt: "2026-07-21T00:00:00.000Z",
      },
      lockedApu: 200,
    });
    expect(wallet.powerUps).toBe(800);
    expect(wallet.balanceUsd).toBe(10);
    expect(wallet.playerId).toBe("p1");
  });
});
