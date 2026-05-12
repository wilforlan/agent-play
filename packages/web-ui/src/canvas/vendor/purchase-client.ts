/**
 * @packageDocumentation
 * @module @agent-play/play-ui/purchase-client
 *
 * Browser client for the `purchase` RPC. The server uses `WATCH`/`MULTI`
 * to atomically claim the item, decrement the wallet, and append a
 * purchase record — see
 * `packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`.
 *
 * @public
 */

import type { WalletDto } from "./wallet-client.js";

/**
 * Reference to a single purchasable item.
 *
 * @public
 */
export type PurchaseItemRef = {
  readonly kind: "shop" | "supermarket" | "carwash";
  readonly id: string;
};

/**
 * Successful purchase response from the server.
 *
 * @public
 */
export type PurchaseSuccess = {
  readonly ok: true;
  readonly wallet: WalletDto;
  readonly purchaseId: string;
  readonly soldAt: string;
};

/**
 * Error response from the server.
 *
 * @public
 */
export type PurchaseError = {
  readonly ok: false;
  readonly error: "ITEM_ALREADY_SOLD" | "INSUFFICIENT_FUNDS" | "UNKNOWN";
  readonly message: string;
};

/**
 * Result of a {@link executePurchase} call.
 *
 * @public
 */
export type PurchaseResult = PurchaseSuccess | PurchaseError;

/**
 * Execute a purchase via the RPC route.
 *
 * @example
 * ```ts
 * const result = await executePurchase({
 *   sid,
 *   playerId,
 *   spaceId,
 *   amenityKind: "shop",
 *   itemRef: { kind: "shop", id: itemId },
 * });
 * if (!result.ok && result.error === "INSUFFICIENT_FUNDS") {
 *   tooltip.setError("Insufficient funds");
 * }
 * ```
 *
 * @public
 */
export const executePurchase = async (input: {
  sid: string;
  playerId: string;
  spaceId: string;
  amenityKind: "shop" | "supermarket" | "car_wash";
  itemRef: PurchaseItemRef;
  fetcher?: typeof fetch;
}): Promise<PurchaseResult> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "purchase",
      payload: {
        playerId: input.playerId,
        spaceId: input.spaceId,
        amenityKind: input.amenityKind,
        itemRef: input.itemRef,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    wallet?: WalletDto;
    purchaseId?: string;
    soldAt?: string;
    error?: string;
    message?: string;
  };
  if (response.ok && typeof json.wallet === "object" && json.wallet !== null) {
    return {
      ok: true,
      wallet: json.wallet,
      purchaseId: json.purchaseId ?? "",
      soldAt: json.soldAt ?? "",
    };
  }
  const code = json.error === "ITEM_ALREADY_SOLD" ||
    json.error === "INSUFFICIENT_FUNDS"
    ? json.error
    : "UNKNOWN";
  return {
    ok: false,
    error: code,
    message: json.message ?? `HTTP ${response.status}`,
  };
};
