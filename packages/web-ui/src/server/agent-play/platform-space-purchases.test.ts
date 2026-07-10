import { describe, expect, it } from "vitest";
import type Redis from "ioredis";
import { buildPlatformSpacePurchases } from "./platform-space-purchases.js";

const hostId = "host-test";

function createRedisMock(
  txRows: Array<{
    id: string;
    at: string;
    spaceId: string;
    op: string;
    amenityKind: string;
    playerId: string;
    priceUsd?: number;
    itemRef: { kind: string; id: string };
  }>
): Redis {
  const store = new Map<string, string>();
  const zset: Array<{ score: number; member: string }> = [];
  for (const row of txRows) {
    const key = `agent-play:${hostId}:scanner:tx:${row.id}`;
    store.set(
      key,
      JSON.stringify({ ...row, hostId, indexedAt: row.at })
    );
    zset.push({ score: Date.parse(row.at), member: row.id });
  }
  return {
    zrevrange: async () =>
      [...zset].sort((a, b) => b.score - a.score).map((e) => e.member),
    get: async (key: string) => store.get(key) ?? null,
  } as unknown as Redis;
}

describe("buildPlatformSpacePurchases", () => {
  it("returns purchase rows for the space ordered newest first", async () => {
    const now = Date.now();
    const redis = createRedisMock([
      {
        id: "tx-1",
        at: new Date(now - 120_000).toISOString(),
        spaceId: "space-1",
        op: "purchase",
        amenityKind: "shop",
        playerId: "player-a",
        priceUsd: 12,
        itemRef: { kind: "shop", id: "item-1" },
      },
      {
        id: "tx-2",
        at: new Date(now - 60_000).toISOString(),
        spaceId: "space-1",
        op: "purchase",
        amenityKind: "car_wash",
        playerId: "player-b",
        priceUsd: 8,
        itemRef: { kind: "carwash", id: "car-1" },
      },
      {
        id: "tx-3",
        at: new Date(now - 30_000).toISOString(),
        spaceId: "space-2",
        op: "purchase",
        amenityKind: "shop",
        playerId: "player-c",
        priceUsd: 1,
        itemRef: { kind: "shop", id: "x" },
      },
    ]);

    const result = await buildPlatformSpacePurchases({
      redis,
      hostId,
      spaceId: "space-1",
      limit: 10,
    });

    expect(result.purchases).toHaveLength(2);
    expect(result.purchases[0]?.id).toBe("tx-2");
    expect(result.purchases[1]?.playerId).toBe("player-a");
  });

  it("filters by sinceMs", async () => {
    const now = Date.now();
    const redis = createRedisMock([
      {
        id: "old",
        at: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
        spaceId: "space-1",
        op: "purchase",
        amenityKind: "shop",
        playerId: "p",
        priceUsd: 1,
        itemRef: { kind: "shop", id: "a" },
      },
      {
        id: "new",
        at: new Date(now - 60_000).toISOString(),
        spaceId: "space-1",
        op: "purchase",
        amenityKind: "shop",
        playerId: "p",
        priceUsd: 2,
        itemRef: { kind: "shop", id: "b" },
      },
    ]);

    const result = await buildPlatformSpacePurchases({
      redis,
      hostId,
      spaceId: "space-1",
      sinceMs: now - 24 * 60 * 60 * 1000,
      limit: 10,
    });

    expect(result.purchases).toHaveLength(1);
    expect(result.purchases[0]?.id).toBe("new");
  });
});
