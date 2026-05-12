import { describe, expect, it, vi } from "vitest";
import {
  buildPurchaseItemKey,
  fetchPurchases,
} from "./wallet-purchases-client.js";

const wallet = {
  playerId: "u",
  balanceUsd: 12.34,
  currency: "USD" as const,
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("wallet-purchases-client: buildPurchaseItemKey", () => {
  it("uses the itemRef kind directly (carwash, not car_wash)", () => {
    expect(
      buildPurchaseItemKey({
        itemRef: { kind: "carwash", id: "car-1" },
        spaceId: "space-A",
      })
    ).toBe("carwash:space-A:car-1");
  });

  it("includes the space id so two amenities cannot collide", () => {
    expect(
      buildPurchaseItemKey({
        itemRef: { kind: "shop", id: "x" },
        spaceId: "space-A",
      })
    ).not.toBe(
      buildPurchaseItemKey({
        itemRef: { kind: "shop", id: "x" },
        spaceId: "space-B",
      })
    );
  });
});

describe("wallet-purchases-client: fetchPurchases", () => {
  it("returns wallet + purchases + items on a successful response", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            wallet,
            purchases: [
              {
                id: "p1",
                playerId: "u",
                spaceId: "space-A",
                amenityKind: "car_wash",
                itemRef: { kind: "carwash", id: "car-1" },
                priceUsd: 100,
                at: "2026-01-01T00:00:00.000Z",
              },
            ],
            items: {
              "carwash:space-A:car-1": { id: "car-1", name: "GTR" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    );

    const result = await fetchPurchases({
      sid: "s1",
      playerId: "u",
      fetcher,
    });
    expect(result.wallet.balanceUsd).toBe(12.34);
    expect(result.purchases.length).toBe(1);
    expect(result.purchases[0]?.itemRef.id).toBe("car-1");
    expect(result.items["carwash:space-A:car-1"]).toEqual({
      id: "car-1",
      name: "GTR",
    });

    const firstCall = fetcher.mock.calls[0];
    expect(firstCall).toBeDefined();
    const init = firstCall?.[1];
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string) as {
      op: string;
      payload: { playerId: string; limit?: number };
    };
    expect(body.op).toBe("listPurchases");
    expect(body.payload.playerId).toBe("u");
    expect(body.payload.limit).toBeUndefined();
  });

  it("forwards a custom limit when provided", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ wallet, purchases: [], items: {} }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    );
    await fetchPurchases({ sid: "s1", playerId: "u", limit: 7, fetcher });
    const firstCall = fetcher.mock.calls[0];
    expect(firstCall).toBeDefined();
    const init = firstCall?.[1];
    const body = JSON.parse(init?.body as string) as {
      payload: { limit?: number };
    };
    expect(body.payload.limit).toBe(7);
  });

  it("throws on a non-200 response", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("{}", { status: 500, headers: {} })
    );
    await expect(
      fetchPurchases({ sid: "s1", playerId: "u", fetcher })
    ).rejects.toThrow();
  });

  it("throws on a malformed response", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ wallet: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
    );
    await expect(
      fetchPurchases({ sid: "s1", playerId: "u", fetcher })
    ).rejects.toThrow();
  });
});
