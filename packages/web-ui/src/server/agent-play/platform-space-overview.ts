import type Redis from "ioredis";
import { isItemAvailableForPurchase } from "@agent-play/sdk";
import { getScannerTx } from "../scanner/scanner-indexer.js";
import { scannerTxsKey } from "../scanner/scanner-keys.js";
import type { SessionStore } from "./session-store.js";

export type PlatformSpaceOverview = {
  spaceId: string;
  generatedAt: string;
  gmvUsd: number;
  gmvUsd24h: number;
  purchaseCount: number;
  purchaseCount24h: number;
  itemsAvailable: number;
  itemsSold: number;
  byAmenityKind: ReadonlyArray<{ kind: string; purchases: number; gmvUsd: number }>;
};

const PURCHASE_OPS = new Set(["purchase"]);

const countItems = async (
  store: SessionStore,
  spaceId: string
): Promise<{ available: number; sold: number }> => {
  const [shop, supermarket, cars] = await Promise.all([
    store.listShopItems(spaceId),
    store.listSupermarketItems(spaceId),
    store.listCarWashCars(spaceId),
  ]);
  const all = [...shop, ...supermarket, ...cars];
  let available = 0;
  let sold = 0;
  for (const item of all) {
    if (isItemAvailableForPurchase(item)) {
      available += 1;
    } else {
      sold += 1;
    }
  }
  return { available, sold };
};

export const buildPlatformSpaceOverview = async (options: {
  redis: Redis;
  hostId: string;
  spaceId: string;
  store: SessionStore;
  nowMs?: number;
}): Promise<PlatformSpaceOverview> => {
  const { redis, hostId, spaceId, store } = options;
  const nowMs = options.nowMs ?? Date.now();
  const cutoff24h = nowMs - 24 * 60 * 60 * 1000;

  const ids = await redis.zrevrange(scannerTxsKey(hostId), 0, 2000);
  let gmvUsd = 0;
  let gmvUsd24h = 0;
  let purchaseCount = 0;
  let purchaseCount24h = 0;
  const byKind = new Map<string, { purchases: number; gmvUsd: number }>();

  for (const id of ids) {
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
    const price = tx.priceUsd ?? 0;
    const atMs = Date.parse(tx.at);
    purchaseCount += 1;
    gmvUsd += price;
    if (Number.isFinite(atMs) && atMs >= cutoff24h) {
      purchaseCount24h += 1;
      gmvUsd24h += price;
    }
    const current = byKind.get(tx.amenityKind) ?? { purchases: 0, gmvUsd: 0 };
    byKind.set(tx.amenityKind, {
      purchases: current.purchases + 1,
      gmvUsd: current.gmvUsd + price,
    });
  }

  const itemCounts = await countItems(store, spaceId);

  return {
    spaceId,
    generatedAt: new Date(nowMs).toISOString(),
    gmvUsd,
    gmvUsd24h,
    purchaseCount,
    purchaseCount24h,
    itemsAvailable: itemCounts.available,
    itemsSold: itemCounts.sold,
    byAmenityKind: [...byKind.entries()]
      .map(([kind, stats]) => ({ kind, ...stats }))
      .sort((a, b) => b.gmvUsd - a.gmvUsd),
  };
};
