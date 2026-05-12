import { describe, expect, it, vi } from "vitest";
import { executePurchase } from "./purchase-client.js";

const mockFetcher = (response: {
  ok: boolean;
  status?: number;
  body?: unknown;
}): typeof fetch =>
  vi.fn(async () => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body,
  })) as unknown as typeof fetch;

describe("purchase-client: executePurchase", () => {
  it("returns ok payload on a successful purchase", async () => {
    const fetcher = mockFetcher({
      ok: true,
      body: {
        wallet: {
          playerId: "p1",
          balanceUsd: 60,
          currency: "USD",
          updatedAt: "now",
        },
        purchaseId: "pur_123",
        soldAt: "now",
      },
    });
    const result = await executePurchase({
      sid: "sid",
      playerId: "p1",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      fetcher,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.wallet.balanceUsd).toBe(60);
      expect(result.purchaseId).toBe("pur_123");
    }
  });

  it("maps ITEM_ALREADY_SOLD error responses", async () => {
    const fetcher = mockFetcher({
      ok: false,
      status: 409,
      body: { error: "ITEM_ALREADY_SOLD", message: "Item already sold" },
    });
    const result = await executePurchase({
      sid: "sid",
      playerId: "p1",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      fetcher,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ITEM_ALREADY_SOLD");
  });

  it("maps INSUFFICIENT_FUNDS error responses", async () => {
    const fetcher = mockFetcher({
      ok: false,
      status: 409,
      body: { error: "INSUFFICIENT_FUNDS", message: "no money" },
    });
    const result = await executePurchase({
      sid: "sid",
      playerId: "p1",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      fetcher,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_FUNDS");
  });

  it("falls back to UNKNOWN error for unrecognised payloads", async () => {
    const fetcher = mockFetcher({ ok: false, status: 500, body: {} });
    const result = await executePurchase({
      sid: "sid",
      playerId: "p1",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      fetcher,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("UNKNOWN");
  });
});
