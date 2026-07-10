import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsEventForPublic } from "../analytics/analytics-payload.js";
import { buildScannerNodeProfile } from "./scanner-node-profile.js";
import {
  analyticsByUserKey,
  analyticsEventBodyKey,
  analyticsTraitsKey,
} from "../analytics/analytics-keys.js";
import { scannerNodeCacheKey } from "./scanner-cache.js";
import {
  scannerTxByPlayerKey,
  scannerTxKey,
  scannerWalletKey,
} from "./scanner-keys.js";

type MockRedis = {
  strings: Map<string, string>;
  hashes: Map<string, Map<string, string>>;
  zsets: Map<string, Map<string, number>>;
  get: (key: string) => Promise<string | null>;
  hgetall: (key: string) => Promise<Record<string, string>>;
  zrevrange: (key: string, start: number, stop: number) => Promise<string[]>;
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
    max: string | number
  ) => Promise<string[]>;
  zcard: (key: string) => Promise<number>;
  zscore: (key: string, member: string) => Promise<string | null>;
  exists: (key: string) => Promise<number>;
  scan: (
    cursor: string,
    matchKeyword: string,
    pattern: string,
    countKeyword: string,
    count: number
  ) => Promise<[string, string[]]>;
};

const createMockRedis = (): MockRedis => {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const zsets = new Map<string, Map<string, number>>();

  return {
    strings,
    hashes,
    zsets,
    async get(key) {
      return strings.get(key) ?? null;
    },
    async hgetall(key) {
      const bucket = hashes.get(key);
      if (bucket === undefined) return {};
      return Object.fromEntries(bucket.entries());
    },
    async exists(key) {
      return strings.has(key) || hashes.has(key) ? 1 : 0;
    },
    async scan() {
      return ["0", []];
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
    async zrangebyscore(key, min, max) {
      const bucket = zsets.get(key);
      if (bucket === undefined) return [];
      const minScore = min === "-inf" ? -Infinity : Number(min);
      const maxScore = max === "+inf" ? Infinity : Number(max);
      return [...bucket.entries()]
        .filter(([, score]) => score >= minScore && score <= maxScore)
        .sort((a, b) => a[1] - b[1])
        .map(([member]) => member);
    },
    async zcard(key) {
      return zsets.get(key)?.size ?? 0;
    },
    async zscore(key, member) {
      const score = zsets.get(key)?.get(member);
      return score !== undefined ? String(score) : null;
    },
  };
};

describe("sanitizeAnalyticsEventForPublic", () => {
  it("strips context.sid from analytics events", () => {
    const sanitized = sanitizeAnalyticsEventForPublic({
      messageId: "msg-1",
      event: "Purchase Completed",
      distinctId: "node-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      properties: { amenityKind: "shop", sid: "secret" },
      context: {
        hostId: "default",
        sid: "secret-session",
        library: "agent-play-server",
      },
    });
    expect(sanitized.context?.sid).toBeUndefined();
    expect(sanitized.properties.sid).toBeUndefined();
    expect(sanitized.properties.amenityKind).toBe("shop");
  });
});

describe("buildScannerNodeProfile", () => {
  it("aggregates ledger KPIs and amenity breakdown from indexed txs", async () => {
    const redis = createMockRedis();
    const hostId = "default";
    const nodeId = "node-1";

    redis.strings.set(
      scannerWalletKey(hostId, nodeId),
      JSON.stringify({
        playerId: nodeId,
        balanceUsd: 8,
        currency: "USD",
        powerUps: 12,
        updatedAt: "2026-01-02T00:00:00.000Z",
      })
    );
    redis.hashes.set(
      scannerNodeCacheKey(hostId, nodeId),
      new Map([
        ["txCount", "2"],
        ["usdSpent", "15"],
        ["apuMinted", "5"],
        ["apuBurned", "1"],
        ["lastTxAt", "2026-01-02T00:00:00.000Z"],
      ])
    );

    const tx1 = {
      id: "tx-1",
      playerId: nodeId,
      spaceId: "space-a",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      priceUsd: 10,
      powerUpsDelta: 5,
      at: "2026-01-01T00:00:00.000Z",
      hostId,
      indexedAt: "2026-01-01T00:00:00.000Z",
      op: "purchase",
    };
    const tx2 = {
      ...tx1,
      id: "tx-2",
      spaceId: "space-b",
      amenityKind: "supermarket",
      priceUsd: 5,
      powerUpsDelta: -1,
      at: "2026-01-02T00:00:00.000Z",
    };

    redis.strings.set(scannerTxKey(hostId, "tx-1"), JSON.stringify(tx1));
    redis.strings.set(scannerTxKey(hostId, "tx-2"), JSON.stringify(tx2));
    const byPlayer = new Map<string, number>([
      ["tx-1", Date.parse(tx1.at)],
      ["tx-2", Date.parse(tx2.at)],
    ]);
    redis.zsets.set(scannerTxByPlayerKey(hostId, nodeId), byPlayer);

    redis.zsets.set(
      analyticsByUserKey(hostId, nodeId),
      new Map([["msg-1", Date.parse("2026-01-01T00:00:00.000Z")]])
    );
    redis.strings.set(
      analyticsEventBodyKey(hostId, "msg-1"),
      JSON.stringify({
        messageId: "msg-1",
        event: "Purchase Completed",
        distinctId: nodeId,
        timestamp: "2026-01-01T00:00:00.000Z",
        properties: { amenityKind: "shop" },
        context: {
          hostId,
          sid: "secret",
          library: "agent-play-server",
        },
      })
    );
    redis.hashes.set(
      analyticsTraitsKey(hostId, nodeId),
      new Map([
        ["nodeKind", "main"],
        ["email", "hidden@example.com"],
      ])
    );

    const profile = await buildScannerNodeProfile({
      redis: redis as never,
      hostId,
      nodeId,
    });

    expect(profile.nodeId).toBe(nodeId);
    expect(profile.ledger.txCount).toBe(2);
    expect(profile.ledger.usdSpent).toBe(15);
    expect(profile.breakdown.byAmenityKind.shop).toBe(1);
    expect(profile.breakdown.byAmenityKind.supermarket).toBe(1);
    expect(profile.analyticsEvents[0]?.context).toBeUndefined();
    expect(profile.traits.nodeKind).toBe("main");
    expect(profile.traits.email).toBeUndefined();
  });
});
