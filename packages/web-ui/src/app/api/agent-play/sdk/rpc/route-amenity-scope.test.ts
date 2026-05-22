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
    getNode: vi.fn(async () => ({ kind: "space", spaceId: "space-1" })),
  };
}

function buildWorldMock(
  amenities: Array<"shop" | "supermarket" | "car_wash">
) {
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

function buildStoreMock(overrides?: {
  shopItems?: Array<{ id: string }>;
  supermarketItems?: Array<{ id: string }>;
  carWashCars?: Array<{ id: string }>;
}) {
  return {
    getSessionId: vi.fn(() => "s1"),
    listShopItems: vi.fn(async () => overrides?.shopItems ?? []),
    listSupermarketItems: vi.fn(async () => overrides?.supermarketItems ?? []),
    listCarWashCars: vi.fn(async () => overrides?.carWashCars ?? []),
    listSpaceLeases: vi.fn(async () => []),
    listSpaceAmenityLogs: vi.fn(async () => []),
    removeShopItem: vi.fn(async () => true),
    removeSupermarketItem: vi.fn(async () => true),
    removeCarWashCar: vi.fn(async () => true),
    appendSpaceAmenityLog: vi.fn(async () => undefined),
    publishWorldFanout: vi.fn(async () => undefined),
    persistSnapshotReturningRev: vi.fn(async () => ({
      rev: 2,
      merkleRootHex: "deadbeef",
      merkleLeafCount: 1,
    })),
  };
}

describe("POST /api/agent-play/sdk/rpc — inspectAmenity returns items", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("returns the items array for the requested kind", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
    const shopItems = [{ id: "shop-1" }, { id: "shop-2" }];
    const store = buildStoreMock({ shopItems });
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
          op: "inspectAmenity",
          payload: { spaceId: "space-1", kind: "shop" },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      kind?: string;
      items: Array<{ id: string }>;
      logs: unknown[];
      leases: unknown[];
    };
    expect(body.kind).toBe("shop");
    expect(body.items.map((i) => i.id)).toEqual(["shop-1", "shop-2"]);
    expect(body.logs).toEqual([]);
    expect(body.leases).toEqual([]);
  });

  it("returns grouped items when no kind is specified", async () => {
    getPlayWorld.mockResolvedValue(
      buildWorldMock(["shop", "supermarket", "car_wash"])
    );
    const store = buildStoreMock({
      shopItems: [{ id: "shop-1" }],
      supermarketItems: [{ id: "sm-1" }],
      carWashCars: [{ id: "car-1" }],
    });
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
          op: "inspectAmenity",
          payload: { spaceId: "space-1" },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: {
        shopItems: Array<{ id: string }>;
        supermarketItems: Array<{ id: string }>;
        carWashCars: Array<{ id: string }>;
      };
    };
    expect(body.items.shopItems.map((i) => i.id)).toEqual(["shop-1"]);
    expect(body.items.supermarketItems.map((i) => i.id)).toEqual(["sm-1"]);
    expect(body.items.carWashCars.map((i) => i.id)).toEqual(["car-1"]);
  });
});

describe("POST /api/agent-play/sdk/rpc — removeAmenityItems", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("removes all items of the requested kind when all=true", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
    const store = buildStoreMock({
      shopItems: [{ id: "shop-1" }, { id: "shop-2" }],
    });
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
          op: "removeAmenityItems",
          payload: { spaceId: "space-1", kind: "shop", all: true },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      removed: string[];
      requested: number;
    };
    expect(body.removed.sort()).toEqual(["shop-1", "shop-2"]);
    expect(body.requested).toBe(2);
    expect(store.removeShopItem).toHaveBeenCalledTimes(2);
    expect(store.publishWorldFanout).toHaveBeenCalled();
  });

  it("removes only the provided itemIds", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["supermarket"]));
    const store = buildStoreMock({
      supermarketItems: [
        { id: "sm-1" },
        { id: "sm-2" },
        { id: "sm-3" },
      ],
    });
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
          op: "removeAmenityItems",
          payload: {
            spaceId: "space-1",
            kind: "supermarket",
            itemIds: ["sm-1", "sm-3"],
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { removed: string[] };
    expect(body.removed.sort()).toEqual(["sm-1", "sm-3"]);
    expect(store.removeSupermarketItem).toHaveBeenCalledTimes(2);
  });

  it("returns AMENITY_NOT_ON_SPACE when the space lacks that amenity", async () => {
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
          op: "removeAmenityItems",
          payload: { spaceId: "space-1", kind: "supermarket", all: true },
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("AMENITY_NOT_ON_SPACE");
  });

  it("rejects invalid payloads (no all, no itemIds)", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock(["shop"]));
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
          op: "removeAmenityItems",
          payload: { spaceId: "space-1", kind: "shop" },
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});
