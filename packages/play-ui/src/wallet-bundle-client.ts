/**
 * @packageDocumentation
 * @module @agent-play/play-ui/wallet-bundle-client
 *
 * Browser client for the `redeemWalletBundle` RPC.
 *
 * @public
 */

export type RedeemWalletBundleResult = {
  readonly wallet: {
    readonly playerId: string;
    readonly balanceUsd: number;
    readonly powerUps: number;
    readonly currency: "USD";
    readonly updatedAt: string;
  };
};

export const redeemWalletBundle = async (input: {
  sid: string;
  playerId: string;
  bundleId: string;
  fetcher?: typeof fetch;
}): Promise<RedeemWalletBundleResult> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "redeemWalletBundle",
      payload: {
        playerId: input.playerId,
        bundleId: input.bundleId,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    wallet?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:wallet-bundle] ${err}`);
  }
  if (typeof json.wallet !== "object" || json.wallet === null) {
    throw new Error("[agent-play:wallet-bundle] unexpected response shape");
  }
  const w = json.wallet as {
    playerId?: unknown;
    balanceUsd?: unknown;
    powerUps?: unknown;
    updatedAt?: unknown;
    currency?: unknown;
  };
  if (
    typeof w.playerId !== "string" ||
    typeof w.balanceUsd !== "number" ||
    typeof w.updatedAt !== "string"
  ) {
    throw new Error("[agent-play:wallet-bundle] unexpected wallet shape");
  }
  const powerUps =
    typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
      ? Math.max(0, Math.floor(w.powerUps))
      : 0;
  return {
    wallet: {
      playerId: w.playerId,
      balanceUsd: w.balanceUsd,
      powerUps,
      currency: "USD",
      updatedAt: w.updatedAt,
    },
  };
};
