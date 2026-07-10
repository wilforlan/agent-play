import { describe, expect, it } from "vitest";
import { indexPurchaseRecord, getScannerTx } from "./scanner-indexer.js";
import { scannerTxKey, scannerTxsKey } from "./scanner-keys.js";

type Stored = {
  strings: Map<string, string>;
  zsets: Map<string, Map<string, number>>;
  hashes: Map<string, Map<string, string>>;
};

const createMockRedis = (): Stored & {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<"OK">;
  zadd: (key: string, score: number, member: string) => Promise<number>;
  incr: (key: string) => Promise<number>;
  incrby: (key: string, amount: number) => Promise<number>;
  hset: (key: string, row: Record<string, string>) => Promise<number>;
  hgetall: (key: string) => Promise<Record<string, string>>;
  multi: () => {
    set: (key: string, value: string) => void;
    zadd: (key: string, score: number, member: string) => void;
    exec: () => Promise<Array<[null, string]>>;
  };
} => {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  const hashes = new Map<string, Map<string, string>>();
  return {
    strings,
    zsets,
    hashes,
    async get(key) {
      return strings.get(key) ?? null;
    },
    async set(key, value) {
      strings.set(key, value);
      return "OK";
    },
    async incr(key) {
      const next = Number(strings.get(key) ?? 0) + 1;
      strings.set(key, String(next));
      return next;
    },
    async incrby(key, amount) {
      const next = Number(strings.get(key) ?? 0) + amount;
      strings.set(key, String(next));
      return next;
    },
    async hset(key, row) {
      const bucket = hashes.get(key) ?? new Map<string, string>();
      for (const [field, value] of Object.entries(row)) {
        bucket.set(field, value);
      }
      hashes.set(key, bucket);
      return 1;
    },
    async hgetall(key) {
      const bucket = hashes.get(key);
      if (bucket === undefined) return {};
      return Object.fromEntries(bucket.entries());
    },
    multi() {
      const ops: Array<() => void> = [];
      return {
        set(key: string, value: string) {
          ops.push(() => {
            strings.set(key, value);
          });
        },
        zadd(key: string, score: number, member: string) {
          ops.push(() => {
            const bucket = zsets.get(key) ?? new Map<string, number>();
            bucket.set(member, score);
            zsets.set(key, bucket);
          });
        },
        async exec() {
          for (const op of ops) op();
          return ops.map(() => [null, "OK"] as [null, string]);
        },
      };
    },
  };
};

describe("scanner-indexer", () => {
  it("indexes purchase records idempotently", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const record = {
      id: "tx-1",
      playerId: "node-1",
      spaceId: "space-1",
      amenityKind: "shop" as const,
      itemRef: { kind: "shop" as const, id: "item-1" },
      priceUsd: 5,
      at: "2026-01-01T00:00:00.000Z",
    };

    await indexPurchaseRecord({ redis: redis as never, hostId, record });
    await indexPurchaseRecord({ redis: redis as never, hostId, record });

    const tx = await getScannerTx({
      redis: redis as never,
      hostId,
      txId: "tx-1",
    });
    expect(tx?.id).toBe("tx-1");
    expect(redis.strings.get(scannerTxKey(hostId, "tx-1"))).toBeTruthy();
    expect(redis.zsets.get(scannerTxsKey(hostId))?.size).toBe(1);
  });
});
