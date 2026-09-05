import { describe, expect, it } from "vitest";
import { buildScannerTalkSummary } from "./scanner-economy.js";
import { scannerTalkCacheKey } from "./scanner-keys.js";

const createMockRedis = () => {
  const hashes = new Map<string, Map<string, string>>();
  return {
    hashes,
    async hgetall(key: string) {
      const bucket = hashes.get(key);
      return bucket === undefined ? {} : Object.fromEntries(bucket.entries());
    },
  };
};

describe("buildScannerTalkSummary", () => {
  it("keeps talk totals after more than 2000 newer unrelated journal rows", async () => {
    const redis = createMockRedis();
    redis.hashes.set(
      scannerTalkCacheKey("host-1"),
      new Map([
        ["sessions", "2"],
        ["totalChargedUsd", "0.264"],
        ["totalApuEarned", "1"],
      ]),
    );

    const summary = await buildScannerTalkSummary({
      redis: redis as never,
      hostId: "host-1",
    });
    expect(summary.sessions).toBe(2);
    expect(summary.totalChargedUsd).toBe(0.264);
    expect(summary.totalApuEarned).toBe(1);
  });

  it("reads talk totals from the write-through cache", async () => {
    const redis = createMockRedis();
    redis.hashes.set(
      scannerTalkCacheKey("host-1"),
      new Map([
        ["sessions", "2"],
        ["totalChargedUsd", "0.264"],
        ["totalApuEarned", "1"],
      ]),
    );

    const summary = await buildScannerTalkSummary({
      redis: redis as never,
      hostId: "host-1",
    });
    expect(summary.sessions).toBe(2);
    expect(summary.totalChargedUsd).toBe(0.264);
    expect(summary.totalApuEarned).toBe(1);
  });
});
