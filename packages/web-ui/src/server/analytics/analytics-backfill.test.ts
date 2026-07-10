import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_NAMES } from "@agent-play/sdk";
import { analyticsEventBodyKey } from "./analytics-keys.js";
import { runAnalyticsBackfill } from "./analytics-backfill.js";
import { getAnalyticsEvent } from "./analytics-tracker.js";

type Stored = {
  strings: Map<string, string>;
  lists: Map<string, string[]>;
  hashes: Map<string, Map<string, string>>;
  zsets: Map<string, Map<string, number>>;
  counts: Map<string, number>;
  streams: Array<{ id: string; fields: string[] }>;
};

const createMockRedis = () => {
  const strings = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const hashes = new Map<string, Map<string, string>>();
  const zsets = new Map<string, Map<string, number>>();
  const counts = new Map<string, number>();
  const streams: Array<{ id: string; fields: string[] }> = [];

  const redis = {
    strings,
    lists,
    hashes,
    zsets,
    counts,
    streams,
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
    async xadd(
      _key: string,
      _maxlen: string,
      _approx: string,
      _len: number,
      _id: string,
      ...fields: string[]
    ) {
      streams.push({ id: "1-0", fields });
      return "1-0";
    },
    async incr(key: string) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts.get(key) ?? 1;
    },
    async lrange(key: string, start: number, end: number) {
      const list = lists.get(key) ?? [];
      const sliceEnd = end < 0 ? list.length + end + 1 : end + 1;
      return list.slice(start, sliceEnd);
    },
    async scan(
      cursor: string,
      _matchKeyword: string,
      _pattern: string,
      _countKeyword: string,
      _count: number
    ) {
      if (cursor !== "0") return ["0", []] as [string, string[]];
      return ["0", ["agent-play:default:player:p1:purchases"]] as [
        string,
        string[],
      ];
    },
    multi() {
      const ops: Array<() => void> = [];
      return {
        set(key: string, value: string) {
          ops.push(() => strings.set(key, value));
        },
        xadd(
          _key: string,
          _maxlen: string,
          _approx: string,
          _len: number,
          _id: string,
          ...fields: string[]
        ) {
          ops.push(() => streams.push({ id: "1-0", fields }));
        },
        zadd(key: string, score: number, member: string) {
          ops.push(() => {
            const bucket = zsets.get(key) ?? new Map<string, number>();
            bucket.set(member, score);
            zsets.set(key, bucket);
          });
        },
        incr(key: string) {
          ops.push(() => counts.set(key, (counts.get(key) ?? 0) + 1));
        },
        hincrby(key: string, field: string, amount: number) {
          ops.push(() => {
            const bucket = hashes.get(key) ?? new Map<string, string>();
            const next = Number(bucket.get(field) ?? 0) + amount;
            bucket.set(field, String(next));
            hashes.set(key, bucket);
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

  return redis;
};

describe("analytics-backfill", () => {
  it("derives purchase events idempotently", async () => {
    const redis = createMockRedis();
    const hostId = "default";

    const first = await runAnalyticsBackfill({ redis: redis as never, hostId });
    const second = await runAnalyticsBackfill({ redis: redis as never, hostId });

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    const event = await getAnalyticsEvent({
      redis: redis as never,
      hostId,
      messageId: "backfill:purchase:rec-1",
    });
    expect(event?.event).toBe(ANALYTICS_EVENT_NAMES.purchaseCompleted);
    expect(
      redis.strings.has(analyticsEventBodyKey(hostId, "backfill:purchase:rec-1"))
    ).toBe(true);
  });
});
