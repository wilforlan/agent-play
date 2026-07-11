import type { ParkingDurationTier, ParkingStreetContent } from "@agent-play/sdk/browser";
import type { WalletDto } from "./wallet-client.js";
import { readHumanCredentials } from "./preview-human-credentials.js";
import { nodeCredentialsMaterialFromHumanPassphrase } from "@agent-play/node-tools/browser";

export type BuyParkingTicketResult =
  | {
      ok: true;
      wallet: WalletDto;
      parkingStreet: ParkingStreetContent;
      purchaseId: string;
    }
  | {
      ok: false;
      error:
        | "NO_WALLET_CAR"
        | "SPOT_OCCUPIED"
        | "PARKING_OWNERSHIP_LIMIT"
        | "PARKING_FOREVER_LIMIT"
        | "INSUFFICIENT_FUNDS"
        | "INVALID_SPOT"
        | "UNAUTHORIZED"
        | "UNKNOWN";
      message: string;
    };

export const buyParkingTicket = async (input: {
  sid: string;
  bay: 1 | 2 | 3 | 4;
  layer?: 1 | 2;
  carPurchaseId: string;
  durationTier: ParkingDurationTier;
  displayNick: string;
  fetcher?: typeof fetch;
}): Promise<BuyParkingTicketResult> => {
  const creds = readHumanCredentials();
  if (creds === null) {
    return { ok: false, error: "UNAUTHORIZED", message: "No node credentials" };
  }
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-node-id": creds.nodeId,
      "x-node-passw": nodeCredentialsMaterialFromHumanPassphrase(creds.passw),
    },
    body: JSON.stringify({
      op: "buyParkingTicket",
      payload: {
        bay: input.bay,
        layer: input.layer,
        carPurchaseId: input.carPurchaseId,
        durationTier: input.durationTier,
        displayNick: input.displayNick,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    wallet?: {
      playerId?: unknown;
      balanceUsd?: unknown;
      powerUps?: unknown;
      updatedAt?: unknown;
    };
    parkingStreet?: ParkingStreetContent;
    purchase?: { id?: unknown };
    error?: string;
    message?: string;
  };
  if (
    response.ok &&
    typeof json.wallet === "object" &&
    json.wallet !== null &&
    json.parkingStreet !== undefined
  ) {
    const w = json.wallet;
    if (
      typeof w.playerId !== "string" ||
      typeof w.balanceUsd !== "number" ||
      typeof w.updatedAt !== "string"
    ) {
      return { ok: false, error: "UNKNOWN", message: "invalid wallet response" };
    }
    const powerUps =
      typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
        ? Math.max(0, Math.floor(w.powerUps))
        : 0;
    return {
      ok: true,
      wallet: {
        playerId: w.playerId,
        balanceUsd: w.balanceUsd,
        powerUps,
        currency: "USD",
        updatedAt: w.updatedAt,
      },
      parkingStreet: json.parkingStreet,
      purchaseId:
        typeof json.purchase?.id === "string" ? json.purchase.id : "",
    };
  }
  const knownErrors = [
    "NO_WALLET_CAR",
    "SPOT_OCCUPIED",
    "PARKING_OWNERSHIP_LIMIT",
    "PARKING_FOREVER_LIMIT",
    "INSUFFICIENT_FUNDS",
    "INVALID_SPOT",
  ] as const;
  const code = knownErrors.includes(
    json.error as (typeof knownErrors)[number]
  )
    ? (json.error as BuyParkingTicketResult extends { ok: false; error: infer E }
        ? E
        : never)
    : "UNKNOWN";
  return {
    ok: false,
    error: code,
    message: json.message ?? `HTTP ${String(response.status)}`,
  };
};
