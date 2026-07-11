import type { HouseStreetContent, HouseId } from "@agent-play/sdk/browser";
import type { WalletDto } from "./wallet-client.js";
import { readHumanCredentials } from "./preview-human-credentials.js";
import { nodeCredentialsMaterialFromHumanPassphrase } from "@agent-play/node-tools/browser";

export type BuyHouseResult =
  | {
      ok: true;
      wallet: WalletDto;
      houseStreet: HouseStreetContent;
      purchaseId: string;
    }
  | {
      ok: false;
      error:
        | "HOUSE_ALREADY_OWNED"
        | "INSUFFICIENT_FUNDS"
        | "INVALID_HOUSE"
        | "UNAUTHORIZED"
        | "UNKNOWN";
      message: string;
    };

export const buyHouse = async (input: {
  sid: string;
  houseId: HouseId;
  ownerName: string;
  ownerSignature: string;
  fetcher?: typeof fetch;
}): Promise<BuyHouseResult> => {
  const creds = readHumanCredentials();
  if (creds === null) {
    return { ok: false, error: "UNAUTHORIZED", message: "No node credentials" };
  }
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const payload = {
    houseId: input.houseId,
    ownerName: input.ownerName.trim(),
    ownerSignature: input.ownerSignature.trim(),
  };
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-node-id": creds.nodeId,
      "x-node-passw": nodeCredentialsMaterialFromHumanPassphrase(creds.passw),
    },
    body: JSON.stringify({
      op: "buyHouse",
      payload,
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    wallet?: {
      playerId?: unknown;
      balanceUsd?: unknown;
      powerUps?: unknown;
      updatedAt?: unknown;
    };
    houseStreet?: HouseStreetContent;
    purchase?: { id?: unknown };
    error?: string;
    message?: string;
  };
  if (
    response.ok &&
    typeof json.wallet === "object" &&
    json.wallet !== null &&
    json.houseStreet !== undefined
  ) {
    const w = json.wallet;
    if (
      typeof w.playerId !== "string" ||
      typeof w.balanceUsd !== "number" ||
      typeof w.updatedAt !== "string"
    ) {
      return { ok: false, error: "UNKNOWN", message: "Unexpected wallet shape" };
    }
    const powerUps =
      typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
        ? Math.max(0, Math.floor(w.powerUps))
        : 0;
    const purchaseId =
      typeof json.purchase === "object" &&
      json.purchase !== null &&
      typeof json.purchase.id === "string"
        ? json.purchase.id
        : "";
    return {
      ok: true,
      wallet: {
        playerId: w.playerId,
        balanceUsd: w.balanceUsd,
        powerUps,
        currency: "USD",
        updatedAt: w.updatedAt,
      },
      houseStreet: json.houseStreet,
      purchaseId,
    };
  }
  const errorCode = json.error ?? "UNKNOWN";
  const allowed = [
    "HOUSE_ALREADY_OWNED",
    "INSUFFICIENT_FUNDS",
    "INVALID_HOUSE",
    "UNAUTHORIZED",
  ] as const;
  const mapped = (allowed as readonly string[]).includes(errorCode)
    ? (errorCode as BuyHouseResult extends { ok: false; error: infer E } ? E : never)
    : "UNKNOWN";
  return {
    ok: false,
    error: mapped,
    message: json.message ?? errorCode,
  };
};
