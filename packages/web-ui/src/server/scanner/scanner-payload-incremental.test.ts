import { describe, expect, it } from "vitest";
import { listScannerTxs } from "./scanner-payload.js";
import { scannerTxKey, scannerTxsKey } from "./scanner-keys.js";

type MockRedis = {
  strings: Map<string, string>;
  zsets: Map<string, Map<string, number>>;
  zrevrange: (
    key: string,
    start: number,
    stop: number
  ) => Promise<string[]>;
  zrevrangebyscore: (
    key: string,
    max: string | number,
    min: string | number,
    limitKeyword: string,
    offset: number,
    count: number
  ) => Promise<string[]>;
  zrangebyscore: (
    key: string,
    min: string | number,
    max: string | number,
    limitKeyword?: string,
    offset?: number,
    count?: number
  ) => Promise<string[]>;
  zscore: (key: string, member: string) => Promise<string | null>;
  get: (key: string) => Promise<string | null>;
};

const createMockRedis = (): MockRedis => {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();

  return {
    strings,
    zsets,
    async get(key) {
      return strings.get(key) ?? null;
    },
    async zrevrange(key, start, stop) {
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      const sorted = [...bucket.entries()].sort((a, b) => b[1] - a[1]);
      return sorted.slice(start, stop + 1).map(([member]) => member);
    },
    async zrevrangebyscore(key, max, min, _limitKeyword, offset, count) {
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      const maxScore = max === "+inf" ? Infinity : Number(max);
      const minScore = min === "-inf" ? -Infinity : Number(min);
      const sorted = [...bucket.entries()]
        .filter(([, score]) => score <= maxScore && score >= minScore)
        .sort((a, b) => b[1] - a[1]);
      return sorted.slice(offset, offset + count).map(([member]) => member);
    },
    async zrangebyscore(key, min, max, limitKeyword, offset, count) {
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      const minScore = min === "-inf" ? -Infinity : Number(min);
      const maxScore = max === "+inf" ? Infinity : Number(max);
      const sorted = [...bucket.entries()]
        .filter(([, score]) => score >= minScore && score <= maxScore)
        .sort((a, b) => a[1] - b[1]);
      if (limitKeyword === "LIMIT" && offset !== undefined && count !== undefined) {
        return sorted.slice(offset, offset + count).map(([member]) => member);
      }
      return sorted.map(([member]) => member);
    },
    async zscore(key, member) {
      const score = zsets.get(key)?.get(member);
      return score !== undefined ? String(score) : null;
    },
  };
};

const seedTx = (
  redis: MockRedis,
  hostId: string,
  input: { id: string; atMs: number; priceUsd?: number }
): void => {
  const record = {
    id: input.id,
    playerId: "node-1",
    spaceId: "space-1",
    amenityKind: "shop",
    itemRef: { kind: "shop", id: "item-1" },
    priceUsd: input.priceUsd ?? 5,
    at: new Date(input.atMs).toISOString(),
    hostId,
    indexedAt: new Date(input.atMs).toISOString(),
    op: "purchase",
  };
  redis.strings.set(scannerTxKey(hostId, input.id), JSON.stringify(record));
  const bucket = redis.zsets.get(scannerTxsKey(hostId)) ?? new Map<string, number>();
  bucket.set(input.id, input.atMs);
  redis.zsets.set(scannerTxsKey(hostId), bucket);
};

describe("listScannerTxs incremental", () => {
  it("returns only txs at or after sinceMs in newest-first order", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    seedTx(redis, hostId, { id: "tx-old", atMs: 1000 });
    seedTx(redis, hostId, { id: "tx-new", atMs: 2000 });
    seedTx(redis, hostId, { id: "tx-newer", atMs: 3000 });

    const page = await listScannerTxs({
      redis: redis as never,
      hostId,
      limit: 10,
      sinceMs: 1500,
    });

    expect(page.txs.map((tx) => tx.id)).toEqual(["tx-newer", "tx-new"]);
    expect(page.nextSinceMs).toBe(3000);
    expect(page.nextCursor).toBeNull();
  });
});
