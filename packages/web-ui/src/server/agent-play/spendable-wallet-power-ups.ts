import type { PlayerWallet } from "@agent-play/sdk";

export const econextAccountVaultsKey = (
  hostId: string,
  nodeId: string
): string => `econext:${hostId}:account:${nodeId}:vaults`;

export const spendablePowerUps = (input: {
  powerUps: number;
  lockedApu: number;
}): number => Math.max(0, input.powerUps - input.lockedApu);

export const sumActiveLockedApuFromVaultHashValues = (
  vaultRawValues: ReadonlyArray<string>
): number => {
  let sum = 0;
  for (const raw of vaultRawValues) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) {
        continue;
      }
      const vault = parsed as { status?: unknown; lockedApu?: unknown };
      if (vault.status !== "active") {
        continue;
      }
      if (typeof vault.lockedApu !== "number" || !Number.isFinite(vault.lockedApu)) {
        continue;
      }
      sum += Math.max(0, Math.floor(vault.lockedApu));
    } catch {
      continue;
    }
  }
  return sum;
};

export const toSpendablePlayerWallet = (input: {
  wallet: PlayerWallet;
  lockedApu: number;
}): PlayerWallet => ({
  ...input.wallet,
  powerUps: spendablePowerUps({
    powerUps: input.wallet.powerUps ?? 0,
    lockedApu: input.lockedApu,
  }),
});
