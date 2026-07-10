/**
 * @packageDocumentation
 * @module @agent-play/play-ui/wallet-purchases-client
 *
 * Browser client for the `listPurchases` RPC. Returns the player's
 * wallet, the newest-first list of purchase records, and a dictionary
 * keyed by `{itemRef.kind}:{spaceId}:{itemId}` of the underlying item
 * payload (shop item, supermarket item, or car-wash car) so the
 * inventory UI can render a sprite or label without a second round-trip.
 *
 * @see ../../web-ui/src/app/api/agent-play/sdk/rpc/route.ts — the server
 *      handler for the `listPurchases` op.
 */

import type { WalletDto } from "./wallet-client.js";

/**
 * A single purchase row as fanned out by the server. Mirrors
 * `PurchaseRecordSchema` in the SDK; we accept the wire shape directly
 * so the client doesn't need to ship the Zod runtime.
 *
 * @public
 */
export type PurchaseRecordDto = {
  readonly id: string;
  readonly playerId: string;
  readonly spaceId: string;
  readonly amenityKind:
    | "shop"
    | "supermarket"
    | "car_wash"
    | "talk_time"
    | "wallet_bundle"
    | "apu_credit"
    | "apu_debit";
  readonly itemRef: {
    readonly kind:
      | "shop"
      | "supermarket"
      | "carwash"
      | "game"
      | "apu"
      | "talk"
      | "bundle";
    readonly id: string;
  };
  readonly priceUsd?: number;
  readonly at: string;
  readonly detail?: string;
  readonly powerUpsSpent?: number;
  readonly powerUpsEarned?: number;
  readonly powerUpsDelta?: number;
  readonly debitSource?: string;
  readonly creditSource?: string;
  readonly counterpartyNodeId?: string;
  readonly token?: "APU";
};

/**
 * Successful response shape.
 *
 * @public
 */
export type ListPurchasesResult = {
  readonly wallet: WalletDto;
  readonly purchases: ReadonlyArray<PurchaseRecordDto>;
  readonly items: Readonly<Record<string, unknown>>;
};

/**
 * Build the dictionary key used to look up the item payload that
 * matches a {@link PurchaseRecordDto}.
 *
 * @public
 */
export const buildPurchaseItemKey = (input: {
  itemRef: PurchaseRecordDto["itemRef"];
  spaceId: string;
}): string | null => {
  if (
    input.itemRef.kind !== "shop" &&
    input.itemRef.kind !== "supermarket" &&
    input.itemRef.kind !== "carwash"
  ) {
    return null;
  }
  return `${input.itemRef.kind}:${input.spaceId}:${input.itemRef.id}`;
};

/**
 * Fetch the player's purchases.
 *
 * @example
 * ```ts
 * const { wallet, purchases, items } = await fetchPurchases({
 *   sid,
 *   playerId,
 * });
 * walletHud.setBalance(wallet.balanceUsd);
 * ```
 *
 * @public
 */
export const fetchPurchases = async (input: {
  sid: string;
  playerId: string;
  limit?: number;
  fetcher?: typeof fetch;
}): Promise<ListPurchasesResult> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const body: {
    op: string;
    payload: { playerId: string; limit?: number };
  } = {
    op: "listPurchases",
    payload: { playerId: input.playerId },
  };
  if (typeof input.limit === "number") {
    body.payload.limit = input.limit;
  }
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `[agent-play:purchases] fetch failed with HTTP ${String(response.status)}`
    );
  }
  const json = (await response.json()) as {
    wallet?: unknown;
    purchases?: unknown;
    items?: unknown;
  };
  if (
    typeof json.wallet !== "object" ||
    json.wallet === null ||
    !Array.isArray(json.purchases) ||
    typeof json.items !== "object" ||
    json.items === null
  ) {
    throw new Error("[agent-play:purchases] unexpected response shape");
  }
  const w = json.wallet as {
    playerId?: unknown;
    balanceUsd?: unknown;
    powerUps?: unknown;
    updatedAt?: unknown;
  };
  if (
    typeof w.playerId !== "string" ||
    w.playerId.trim().length === 0 ||
    typeof w.balanceUsd !== "number" ||
    typeof w.updatedAt !== "string"
  ) {
    throw new Error("[agent-play:purchases] unexpected wallet shape");
  }
  const powerUps =
    typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
      ? Math.max(0, Math.floor(w.powerUps))
      : 0;
  const wallet: WalletDto = {
    playerId: w.playerId,
    balanceUsd: w.balanceUsd,
    powerUps,
    currency: "USD",
    updatedAt: w.updatedAt,
  };
  return {
    wallet,
    purchases: json.purchases as PurchaseRecordDto[],
    items: json.items as Record<string, unknown>,
  };
};
