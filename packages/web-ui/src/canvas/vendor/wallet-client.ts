/**
 * @packageDocumentation
 * @module @agent-play/play-ui/wallet-client
 *
 * Thin browser wrapper around the wallet API route at
 * `/agent-play/players/:id/wallet` (rewritten by Next to
 * `/api/agent-play/players/:id/wallet`).
 *
 * The route is `sid`-gated, so callers must pass the current preview
 * session id. The first call for a player both reads and seeds the
 * server-side wallet at `$10`.
 *
 * @see ../../web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts —
 *      the corresponding server handler.
 */

/**
 * Wallet payload as returned by the API.
 *
 * @public
 */
export type WalletDto = {
  readonly playerId: string;
  readonly balanceUsd: number;
  readonly powerUps: number;
  readonly currency: "USD";
  readonly updatedAt: string;
};

/**
 * Fetch a player's wallet. The first read seeds the wallet to
 * `$10` server-side.
 *
 * @example
 * ```ts
 * const wallet = await fetchPlayerWallet({ playerId, sid });
 * walletHud.setBalance(wallet.balanceUsd);
 * ```
 *
 * @public
 */
export const fetchPlayerWallet = async (input: {
  playerId: string;
  sid: string;
  fetcher?: typeof fetch;
}): Promise<WalletDto> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/agent-play/players/${encodeURIComponent(
    input.playerId
  )}/wallet?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(
      `[agent-play:wallet] fetch failed with HTTP ${response.status}`
    );
  }
  const body = (await response.json()) as unknown;
  if (typeof body !== "object" || body === null) {
    throw new Error("[agent-play:wallet] unexpected wallet payload");
  }
  const envelope = body as { wallet?: unknown };
  const wallet = envelope.wallet ?? body;
  const w = wallet as {
    balanceUsd?: unknown;
    powerUps?: unknown;
    playerId?: unknown;
    currency?: unknown;
    updatedAt?: unknown;
  };
  if (
    typeof wallet !== "object" ||
    wallet === null ||
    typeof w.balanceUsd !== "number" ||
    typeof w.playerId !== "string" ||
    w.playerId.trim().length === 0 ||
    typeof w.updatedAt !== "string"
  ) {
    throw new Error("[agent-play:wallet] unexpected wallet payload");
  }
  const powerUps =
    typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
      ? Math.max(0, Math.floor(w.powerUps))
      : 0;
  return {
    playerId: w.playerId,
    balanceUsd: w.balanceUsd,
    powerUps,
    currency: "USD",
    updatedAt: w.updatedAt,
  };
};
