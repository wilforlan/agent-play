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
 * server-side wallet at `$70`.
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
  readonly currency: "USD";
  readonly updatedAt: string;
};

/**
 * Fetch a player's wallet. The first read seeds the wallet to
 * `$70` server-side.
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
  if (
    typeof wallet !== "object" ||
    wallet === null ||
    typeof (wallet as { balanceUsd?: unknown }).balanceUsd !== "number"
  ) {
    throw new Error("[agent-play:wallet] unexpected wallet payload");
  }
  return wallet as WalletDto;
};
