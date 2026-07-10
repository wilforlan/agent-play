import { describe, expect, it } from "vitest";
import {
  readScannerMigrationState,
  runScannerBackfill,
} from "./scanner-backfill.js";
import { scannerTxKey } from "./scanner-keys.js";

type Stored = {
  strings: Map<string, string>;
  lists: Map<string, string[]>;
  hashes: Map<string, Map<string, string>>;
  zsets: Map<string, Map<string, number>>;
};

const createMockRedis = () => {
  const strings = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const hashes = new Map<string, Map<string, string>>();
  const zsets = new Map<string, Map<string, number>>();

  const redis = {
    strings,
    lists,
    hashes,
    zsets,
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
    async lrange(key: string, start: number, end: number) {
      const list = lists.get(key) ?? [];
      const sliceEnd = end < 0 ? list.length + end + 1 : end + 1;
      return list.slice(start, sliceEnd);
    },
    async scan(
      cursor: string,
      _matchKeyword: string,
      pattern: string
    ) {
      if (cursor !== "0") return ["0", []] as [string, string[]];
      if (pattern.includes("purchases")) {
        return ["0", ["agent-play:default:player:p1:purchases"]] as [
          string,
          string[],
        ];
      }
      if (pattern.includes("wallet")) {
        return ["0", ["agent-play:default:player:p1:wallet"]] as [
          string,
          string[],
        ];
      }
      return ["0", []] as [string, string[]];
    },
    multi() {
      const ops: Array<() => void> = [];
      return {
        set(key: string, value: string) {
          ops.push(() => strings.set(key, value));
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

  lists.set(
    "agent-play:default:player:p1:purchases",
    [
      JSON.stringify({
        id: "rec-1",
        playerId: "p1",
        spaceId: "space-1",
        amenityKind: "shop",
        itemRef: { kind: "shop", id: "item-1" },
        priceUsd: 5,
        at: "2026-01-01T00:00:00.000Z",
      }),
    ]
  );
  strings.set(
    "agent-play:default:player:p1:wallet",
    JSON.stringify({
      playerId: "p1",
      balanceUsd: 10,
      powerUps: 0,
      currency: "USD",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
  );

  return redis;
};

describe("scanner-backfill", () => {
  it("indexes purchases and wallets idempotently", async () => {
    const redis = createMockRedis();
    const hostId = "default";

    const first = await runScannerBackfill({ redis: redis as never, hostId });
    const second = await runScannerBackfill({ redis: redis as never, hostId });

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    expect(redis.strings.has(scannerTxKey(hostId, "rec-1"))).toBe(true);
    const migration = await readScannerMigrationState({
      redis: redis as never,
      hostId,
    });
    expect(migration?.status).toBe("completed");
  });
});
