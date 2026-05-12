import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getPlayWorld,
  getSessionStore,
  getRepository,
  validateAgentPlaySession,
} = vi.hoisted(() => ({
  getPlayWorld: vi.fn(),
  getSessionStore: vi.fn(),
  getRepository: vi.fn(),
  validateAgentPlaySession: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getPlayWorld,
  getSessionStore,
  getRepository,
}));

vi.mock("@/server/agent-play/session-validation", () => ({
  validateAgentPlaySession,
}));

import { POST } from "./route.js";

const post = async (op: string, payload: unknown): Promise<Response> =>
  POST(
    new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op, payload }),
    })
  );

describe("POST /api/agent-play/sdk/rpc — listPurchases", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("rejects an empty playerId", async () => {
    getSessionStore.mockReturnValue({
      getSessionId: vi.fn(() => "s1"),
      listPurchases: vi.fn(async () => []),
    });
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("listPurchases", { playerId: "" });
    expect(res.status).toBe(400);
  });

  it("returns wallet + purchases + items dictionary for a player", async () => {
    const purchases = [
      {
        id: "p1",
        playerId: "u",
        spaceId: "space-A",
        amenityKind: "car_wash" as const,
        itemRef: { kind: "carwash" as const, id: "car-1" },
        priceUsd: 100,
        at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "p2",
        playerId: "u",
        spaceId: "space-A",
        amenityKind: "shop" as const,
        itemRef: { kind: "shop" as const, id: "shop-1" },
        priceUsd: 10,
        at: "2026-01-02T00:00:00.000Z",
      },
    ];
    const store = {
      getSessionId: vi.fn(() => "s1"),
      listPurchases: vi.fn(async () => purchases),
      listShopItems: vi.fn(async () => [{ id: "shop-1", name: "Book" }]),
      listSupermarketItems: vi.fn(async () => []),
      listCarWashCars: vi.fn(async () => [{ id: "car-1", name: "GTR" }]),
      getPlayerWallet: vi.fn(async () => ({
        playerId: "u",
        balanceUsd: 50,
        currency: "USD",
        updatedAt: "2026-01-02T00:00:00.000Z",
      })),
    };
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("listPurchases", { playerId: "u" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      wallet: { balanceUsd: number };
      purchases: Array<{ id: string }>;
      items: Record<string, { id: string; name: string }>;
    };
    expect(body.wallet.balanceUsd).toBe(50);
    expect(body.purchases.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(body.items["shop:space-A:shop-1"]?.name).toBe("Book");
    expect(body.items["carwash:space-A:car-1"]?.name).toBe("GTR");
  });

  it("clamps limit to the [1, 200] range", async () => {
    const listPurchases = vi.fn(async () => []);
    getSessionStore.mockReturnValue({
      getSessionId: vi.fn(() => "s1"),
      listPurchases,
      listShopItems: vi.fn(async () => []),
      listSupermarketItems: vi.fn(async () => []),
      listCarWashCars: vi.fn(async () => []),
      getPlayerWallet: vi.fn(async () => ({
        playerId: "u",
        balanceUsd: 0,
        currency: "USD",
        updatedAt: "2026-01-02T00:00:00.000Z",
      })),
    });
    validateAgentPlaySession.mockResolvedValue(true);

    await post("listPurchases", { playerId: "u", limit: 9999 });
    expect(listPurchases).toHaveBeenCalledWith({ playerId: "u", limit: 200 });

    await post("listPurchases", { playerId: "u", limit: -5 });
    expect(listPurchases).toHaveBeenLastCalledWith({ playerId: "u", limit: 1 });
  });
});
