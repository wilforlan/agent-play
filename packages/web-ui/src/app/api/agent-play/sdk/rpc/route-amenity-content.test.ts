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

function buildSpaceNodeRepoMock() {
  return {
    verifyNodePasswHash: vi.fn(async () => true),
    getNode: vi.fn(async () => ({
      kind: "space",
      spaceId: "space-1",
    })),
  };
}

function buildWorldMock(amenities: Array<"shop" | "supermarket" | "car_wash">) {
  return {
    getSnapshotJson: vi.fn(async () => ({
      sid: "s1",
      worldMap: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, occupants: [] },
      worldLayout: {
        rev: 1,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        zones: [],
        streets: [],
      },
      spaces: [
        {
          id: "space-1",
          name: "Test space",
          description: "",
          designKey: "shop-v1",
          owner: { displayName: "owner" },
          amenities,
        },
      ],
    })),
  };
}

function buildStoreMock() {
  return {
    getSessionId: vi.fn(() => "s1"),
    upsertShopItem: vi.fn(async () => undefined),
    upsertSupermarketItem: vi.fn(async () => undefined),
    upsertCarWashCar: vi.fn(async () => undefined),
    listSupermarketItems: vi.fn(async () => []),
    listCarWashCars: vi.fn(async () => []),
    appendSpaceAmenityLog: vi.fn(async () => undefined),
    executePurchase: vi.fn(),
    publishWorldFanout: vi.fn(async () => undefined),
    persistSnapshotReturningRev: vi.fn(async () => ({
      rev: 2,
      merkleRootHex: "deadbeef",
      merkleLeafCount: 1,
    })),
  };
}

describe("POST /api/agent-play/sdk/rpc — addShopItem", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("creates a shop item when space has the shop amenity", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
    const store = buildStoreMock();
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(buildSpaceNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-node-id": "n",
          "x-node-passw": "p",
        },
        body: JSON.stringify({
          op: "addShopItem",
          payload: {
            spaceId: "space-1",
            type: "book",
            name: "Test Book",
            description: "Great",
            priceUsd: 9.99,
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      item: { id: string; type: string; sale: { status: string } };
    };
    expect(body.item.type).toBe("book");
    expect(body.item.sale.status).toBe("available");
    expect(store.upsertShopItem).toHaveBeenCalledOnce();
  });

  it("returns AMENITY_NOT_ON_SPACE when space lacks shop amenity", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["supermarket"]));
    getSessionStore.mockReturnValue(buildStoreMock());
    getRepository.mockResolvedValue(buildSpaceNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-node-id": "n",
          "x-node-passw": "p",
        },
        body: JSON.stringify({
          op: "addShopItem",
          payload: {
            spaceId: "space-1",
            type: "book",
            name: "Test Book",
            description: "Great",
            priceUsd: 9.99,
          },
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("AMENITY_NOT_ON_SPACE");
  });
});

describe("POST /api/agent-play/sdk/rpc — purchase", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("returns 409 ITEM_ALREADY_SOLD when executePurchase rejects", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
    const store = buildStoreMock();
    store.executePurchase.mockResolvedValue({
      ok: false,
      error: "ITEM_ALREADY_SOLD",
    });
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(null);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "purchase",
          payload: {
            playerId: "p1",
            spaceId: "space-1",
            amenityKind: "shop",
            itemRef: { kind: "shop", id: "shop-1" },
          },
        }),
      })
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("ITEM_ALREADY_SOLD");
  });

  it("returns purchase payload + fans out on success", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
    const store = buildStoreMock();
    store.executePurchase.mockResolvedValue({
      ok: true,
      record: {
        id: "rec-1",
        playerId: "p1",
        spaceId: "space-1",
        amenityKind: "shop",
        itemRef: { kind: "shop", id: "shop-1" },
        priceUsd: 5,
        at: "2026-05-12T00:00:00.000Z",
      },
      wallet: {
        playerId: "p1",
        balanceUsd: 65,
        currency: "USD",
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
      updatedItem: {
        id: "shop-1",
        spaceId: "space-1",
        type: "book",
        name: "x",
        description: "y",
        priceUsd: 5,
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: {
          status: "sold",
          soldToPlayerId: "p1",
          soldAt: "2026-05-12T00:00:00.000Z",
        },
      },
    });
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(null);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "purchase",
          payload: {
            playerId: "p1",
            spaceId: "space-1",
            amenityKind: "shop",
            itemRef: { kind: "shop", id: "shop-1" },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      purchase: { id: string };
      wallet: { balanceUsd: number };
      item: { sale: { status: string } };
    };
    expect(body.purchase.id).toBe("rec-1");
    expect(body.wallet.balanceUsd).toBe(65);
    expect(body.item.sale.status).toBe("sold");
    expect(store.publishWorldFanout).toHaveBeenCalled();
  });
});

describe("POST /api/agent-play/sdk/rpc — getPlayerWallet", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("returns wallet seeded at 70 for a new player", async () => {
    getPlayWorld.mockResolvedValue({});
    const store = buildStoreMock();
    (store as unknown as {
      getPlayerWallet: ReturnType<typeof vi.fn>;
    }).getPlayerWallet = vi.fn(async () => ({
      playerId: "p1",
      balanceUsd: 10,
      currency: "USD",
      updatedAt: "2026-05-12T00:00:00.000Z",
    }));
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(null);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "getPlayerWallet",
          payload: { playerId: "p1" },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { wallet: { balanceUsd: number } };
    expect(body.wallet.balanceUsd).toBe(10);
  });
});
