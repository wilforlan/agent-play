import { describe, expect, it } from "vitest";
import {
  bumpScannerHeadOnBlock,
  bumpScannerHeadOnTx,
  readScannerHeadCache,
  scannerApuBurnHourKey,
  scannerApuMintHourKey,
  scannerHeadCacheKey,
  scannerTxHourKey,
} from "./scanner-cache";

type Stored = {
  strings: Map<string, string>;
  hashes: Map<string, Map<string, string>>;
};

const createMockRedis = () => {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  return {
    strings,
    hashes,
    async get(key: string) {
      return strings.get(key) ?? null;
    },
    async hgetall(key: string) {
      const bucket = hashes.get(key);
      if (bucket === undefined) return {};
      return Object.fromEntries(bucket.entries());
    },
    async hset(key: string, row: Record<string, string>) {
      const bucket = hashes.get(key) ?? new Map<string, string>();
      for (const [field, value] of Object.entries(row)) {
        bucket.set(field, value);
      }
      hashes.set(key, bucket);
      return 1;
    },
    async incr(key: string) {
      const next = Number(strings.get(key) ?? 0) + 1;
      strings.set(key, String(next));
      return next;
    },
    async incrby(key: string, amount: number) {
      const next = Number(strings.get(key) ?? 0) + amount;
      strings.set(key, String(next));
      return next;
    },
  };
};

describe("scanner-cache", () => {
  it("bumps tx and apu counters into hourly buckets", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const at = "2026-06-11T14:30:00.000Z";

    await bumpScannerHeadOnTx({
      redis: redis as never,
      hostId,
      tx: {
        id: "tx-1",
        playerId: "p1",
        spaceId: "s1",
        amenityKind: "shop",
        itemRef: { kind: "shop", id: "i1" },
        priceUsd: 5,
        powerUpsDelta: 15,
        at,
        hostId,
        indexedAt: at,
        op: "purchase",
      },
    });

    const hourKey = scannerTxHourKey(hostId, new Date(at));
    expect(redis.strings.get(hourKey)).toBe("1");
    expect(redis.strings.get(scannerApuMintHourKey(hostId, new Date(at)))).toBe(
      "15"
    );

    const cache = await readScannerHeadCache({
      redis: redis as never,
      hostId,
      nowMs: Date.parse(at),
    });
    expect(cache.txsLast24h).toBe(1);
    expect(cache.apuMintedLast24h).toBe(15);
    expect(cache.apuBurnedLast24h).toBe(0);
    expect(cache.lastTxAtMs).toBe(Date.parse(at));
  });

  it("bumps apu burn on negative delta", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const at = "2026-06-11T15:00:00.000Z";

    await bumpScannerHeadOnTx({
      redis: redis as never,
      hostId,
      tx: {
        id: "tx-2",
        playerId: "p1",
        spaceId: "s1",
        amenityKind: "wallet_bundle",
        itemRef: { kind: "bundle", id: "b1" },
        powerUpsDelta: -100,
        at,
        hostId,
        indexedAt: at,
        op: "redeemWalletBundle",
      },
    });

    const cache = await readScannerHeadCache({
      redis: redis as never,
      hostId,
      nowMs: Date.parse(at),
    });
    expect(cache.apuBurnedLast24h).toBe(100);
  });

  it("updates head hash on block index", async () => {
    const redis = createMockRedis();
    const hostId = "default";

    await bumpScannerHeadOnBlock({
      redis: redis as never,
      hostId,
      block: {
        rev: 42,
        merkleRootHex: "abc",
        merkleLeafCount: 10,
        at: "2026-06-11T16:00:00.000Z",
      },
    });

    const head = redis.hashes.get(scannerHeadCacheKey(hostId));
    expect(head?.get("snapshotRev")).toBe("42");
    expect(head?.get("merkleRootHex")).toBe("abc");
  });
});
