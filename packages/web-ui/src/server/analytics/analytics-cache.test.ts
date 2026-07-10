import { describe, expect, it } from "vitest";
import {
  analyticsEventsHourKey,
  analyticsOverviewCacheKey,
  bumpAnalyticsOverviewOnEvent,
  readAnalyticsOverviewCache,
} from "./analytics-cache.js";

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
  };
};

describe("analytics-cache", () => {
  it("bumps hourly event count and stores last stream id", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const at = "2026-06-11T14:30:00.000Z";

    await bumpAnalyticsOverviewOnEvent({
      redis: redis as never,
      hostId,
      streamId: "1234-0",
      timestamp: at,
    });

    const hourKey = analyticsEventsHourKey(hostId, new Date(at));
    expect(redis.strings.get(hourKey)).toBe("1");
    expect(
      redis.hashes.get(analyticsOverviewCacheKey(hostId))?.get("lastStreamId")
    ).toBe("1234-0");

    const cache = await readAnalyticsOverviewCache({
      redis: redis as never,
      hostId,
      nowMs: Date.parse(at),
    });
    expect(cache.eventsLast24h).toBe(1);
    expect(cache.lastStreamId).toBe("1234-0");
  });
});
