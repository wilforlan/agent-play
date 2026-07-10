import type Redis from "ioredis";
import { getScannerTx } from "../scanner/scanner-indexer.js";
import { scannerTxsKey } from "../scanner/scanner-keys.js";

export type PlatformSpacePurchaseRow = {
  id: string;
  at: string;
  playerId: string;
  amenityKind: string;
  itemRef: { kind: string; id: string };
  priceUsd: number | null;
};

export type PlatformSpacePurchasesPayload = {
  spaceId: string;
  generatedAt: string;
  purchases: ReadonlyArray<PlatformSpacePurchaseRow>;
};

const PURCHASE_OPS = new Set(["purchase"]);

export const buildPlatformSpacePurchases = async (options: {
  redis: Redis;
  hostId: string;
  spaceId: string;
  sinceMs?: number;
  limit?: number;
}): Promise<PlatformSpacePurchasesPayload> => {
  const { redis, hostId, spaceId } = options;
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const sinceMs = options.sinceMs;

  const ids = await redis.zrevrange(scannerTxsKey(hostId), 0, 2000);
  const purchases: PlatformSpacePurchaseRow[] = [];

  for (const id of ids) {
    if (purchases.length >= limit) break;
    const tx = await getScannerTx({ redis, hostId, txId: id });
    if (tx === null || tx.spaceId !== spaceId) continue;
    if (!PURCHASE_OPS.has(tx.op)) continue;
    if (
      tx.amenityKind !== "shop" &&
      tx.amenityKind !== "supermarket" &&
      tx.amenityKind !== "car_wash"
    ) {
      continue;
    }
    const atMs = Date.parse(tx.at);
    if (sinceMs !== undefined && Number.isFinite(atMs) && atMs < sinceMs) {
      continue;
    }
    purchases.push({
      id: tx.id,
      at: tx.at,
      playerId: tx.playerId,
      amenityKind: tx.amenityKind,
      itemRef: tx.itemRef,
      priceUsd: tx.priceUsd ?? null,
    });
  }

  return {
    spaceId,
    generatedAt: new Date().toISOString(),
    purchases,
  };
};
