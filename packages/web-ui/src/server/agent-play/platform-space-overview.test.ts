import { describe, expect, it } from "vitest";
import type Redis from "ioredis";
import { TestSessionStore } from "./session-store.test-double.js";
import { buildPlatformSpaceOverview } from "./platform-space-overview.js";

const hostId = "host-test";

function createRedisMock(txRows: Array<{ id: string; at: string; spaceId: string; op: string; amenityKind: string; priceUsd?: number }>): Redis {
  const store = new Map<string, string>();
  const zset: Array<{ score: number; member: string }> = [];
  for (const row of txRows) {
    const key = `agent-play:${hostId}:scanner:tx:${row.id}`;
    store.set(key, JSON.stringify({ ...row, hostId, indexedAt: row.at, playerId: "p1", itemRef: { kind: "shop", id: "i1" } }));
    zset.push({ score: Date.parse(row.at), member: row.id });
  }
  return {
    zrevrange: async (_key: string, _start: number, _stop: number) =>
      [...zset].sort((a, b) => b.score - a.score).map((e) => e.member),
    get: async (key: string) => store.get(key) ?? null,
  } as unknown as Redis;
}

describe("buildPlatformSpaceOverview", () => {
  it("aggregates GMV and item counts for a space", async () => {
    const now = Date.now();
    const redis = createRedisMock([
      {
        id: "tx-old",
        at: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
        spaceId: "space-1",
        op: "purchase",
        amenityKind: "shop",
        priceUsd: 10,
      },
      {
        id: "tx-new",
        at: new Date(now - 60 * 60 * 1000).toISOString(),
        spaceId: "space-1",
        op: "purchase",
        amenityKind: "supermarket",
        priceUsd: 5,
      },
      {
        id: "tx-other",
        at: new Date(now - 30 * 60 * 1000).toISOString(),
        spaceId: "space-2",
        op: "purchase",
        amenityKind: "shop",
        priceUsd: 99,
      },
    ]);
    const sessionStore = new TestSessionStore();
    await sessionStore.upsertShopItem({
      id: "s1",
      spaceId: "space-1",
      type: "book",
      name: "Hat",
      description: "",
      priceUsd: 10,
      createdAt: new Date().toISOString(),
      sale: { status: "available" },
    });
    await sessionStore.upsertShopItem({
      id: "s2",
      spaceId: "space-1",
      type: "coffee",
      name: "Shirt",
      description: "",
      priceUsd: 20,
      createdAt: new Date().toISOString(),
      sale: { status: "sold", soldAt: new Date().toISOString(), playerId: "p1" },
    });

    const overview = await buildPlatformSpaceOverview({
      redis,
      hostId,
      spaceId: "space-1",
      store: sessionStore,
      nowMs: now,
    });

    expect(overview.spaceId).toBe("space-1");
    expect(overview.gmvUsd).toBe(15);
    expect(overview.gmvUsd24h).toBe(5);
    expect(overview.purchaseCount).toBe(2);
    expect(overview.purchaseCount24h).toBe(1);
    expect(overview.itemsAvailable).toBe(1);
    expect(overview.itemsSold).toBe(1);
    expect(overview.byAmenityKind).toEqual(
      expect.arrayContaining([
        { kind: "shop", purchases: 1, gmvUsd: 10 },
        { kind: "supermarket", purchases: 1, gmvUsd: 5 },
      ])
    );
  });
});
