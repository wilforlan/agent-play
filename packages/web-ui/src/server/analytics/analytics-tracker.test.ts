import { describe, expect, it } from "vitest";
import { trackEvent, getAnalyticsEvent } from "./analytics-tracker.js";
import { analyticsEventBodyKey } from "./analytics-keys.js";
import { ANALYTICS_EVENT_NAMES } from "@agent-play/sdk";

type Stored = {
  strings: Map<string, string>;
  zsets: Map<string, Map<string, number>>;
  hashes: Map<string, Map<string, string>>;
  counts: Map<string, number>;
  streams: Array<{ id: string; fields: string[] }>;
};

const createMockRedis = () => {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  const hashes = new Map<string, Map<string, string>>();
  const counts = new Map<string, number>();
  const streams: Array<{ id: string; fields: string[] }> = [];

  return {
    strings,
    zsets,
    hashes,
    counts,
    streams,
    async get(key: string) {
      return strings.get(key) ?? null;
    },
    async incr(key: string) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts.get(key) ?? 1;
    },
    async hincrby(key: string, field: string, amount: number) {
      const bucket = hashes.get(key) ?? new Map<string, string>();
      const next = Number(bucket.get(field) ?? 0) + amount;
      bucket.set(field, String(next));
      hashes.set(key, bucket);
      return next;
    },
    async hset(key: string, row: Record<string, string>) {
      const bucket = hashes.get(key) ?? new Map<string, string>();
      for (const [field, value] of Object.entries(row)) {
        bucket.set(field, value);
      }
      hashes.set(key, bucket);
      return 1;
    },
    async hgetall(key: string) {
      const bucket = hashes.get(key);
      if (bucket === undefined) return {};
      return Object.fromEntries(bucket.entries());
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
    multi() {
      const ops: Array<() => void> = [];
      return {
        set(key: string, value: string, _ex?: string, _ttl?: number) {
          ops.push(() => strings.set(key, value));
        },
        zadd(key: string, score: number, member: string) {
          ops.push(() => {
            const bucket = zsets.get(key) ?? new Map<string, number>();
            bucket.set(member, score);
            zsets.set(key, bucket);
          });
        },
        incr(key: string) {
          ops.push(() => {
            counts.set(key, (counts.get(key) ?? 0) + 1);
          });
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
};

describe("analytics-tracker", () => {
  it("tracks events idempotently", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const event = {
      messageId: "msg-1",
      event: ANALYTICS_EVENT_NAMES.purchaseCompleted,
      distinctId: "node-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      properties: { priceUsd: 5 },
      context: { hostId, library: "agent-play-server" as const },
    };

    await trackEvent({ redis: redis as never, hostId, event });
    await trackEvent({ redis: redis as never, hostId, event });

    const stored = await getAnalyticsEvent({
      redis: redis as never,
      hostId,
      messageId: "msg-1",
    });
    expect(stored?.event).toBe(ANALYTICS_EVENT_NAMES.purchaseCompleted);
    expect(redis.strings.has(analyticsEventBodyKey(hostId, "msg-1"))).toBe(true);
  });
});
