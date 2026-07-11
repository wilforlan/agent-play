import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createEmptyHouseStreetContent } from "@agent-play/sdk";

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

function buildMainNodeRepoMock() {
  return {
    verifyNodePasswHash: vi.fn(async () => true),
    getNode: vi.fn(async () => ({ kind: "main" })),
  };
}

function buildWorldMock() {
  return {
    getSnapshotJson: vi.fn(async () => ({
      sid: "s1",
      worldMap: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, occupants: [] },
      spaces: [],
    })),
  };
}

function buildStoreMock() {
  const houseStreet = createEmptyHouseStreetContent();
  return {
    getSessionId: vi.fn(() => "s1"),
    buyHouse: vi.fn(async () => ({
      ok: true as const,
      wallet: {
        playerId: "node-main",
        balanceUsd: 3700.01,
        powerUps: 0,
        currency: "USD" as const,
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
      houseStreet: {
        houses: houseStreet.houses.map((h) =>
          h.houseId === 1
            ? {
                ...h,
                ownerNodeId: "node-main",
                ownerDisplayName: "Alex",
                purchasedAt: "2026-05-12T00:00:00.000Z",
              }
            : h
        ),
      },
      record: {
        id: "house-1",
        playerId: "node-main",
        spaceId: "__houses__",
        amenityKind: "house" as const,
        itemRef: { kind: "house" as const, id: "house-1" },
        priceUsd: 1299.99,
        at: "2026-05-12T00:00:00.000Z",
        detail: "House 1 · Studio layout",
      },
    })),
    persistSnapshotReturningRev: vi.fn(async () => ({
      rev: 2,
      merkleRootHex: "deadbeef",
      merkleLeafCount: 1,
    })),
    publishWorldFanout: vi.fn(async () => undefined),
  };
}

describe("POST /api/agent-play/sdk/rpc — buyHouse", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("buys a house with node credentials and fans out", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock());
    const store = buildStoreMock();
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(buildMainNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-node-id": "node-main",
          "x-node-passw": "passw-hash",
        },
        body: JSON.stringify({
          op: "buyHouse",
          payload: {
            houseId: 1,
            ownerName: "Alex Kim",
            ownerSignature: "AK",
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      wallet?: { balanceUsd: number };
      houseStreet?: { houses: Array<{ ownerDisplayName: string | null }> };
    };
    expect(body.wallet?.balanceUsd).toBe(3700.01);
    expect(body.houseStreet?.houses[0]?.ownerDisplayName).toBe("Alex");
    expect(store.buyHouse).toHaveBeenCalledOnce();
    expect(store.publishWorldFanout).toHaveBeenCalled();
  });

  it("returns 400 when owner name or signature is missing", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock());
    const store = buildStoreMock();
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(buildMainNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-node-id": "node-main",
          "x-node-passw": "passw-hash",
        },
        body: JSON.stringify({
          op: "buyHouse",
          payload: { houseId: 1 },
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(store.buyHouse).not.toHaveBeenCalled();
  });

  it("returns 409 when house is already owned", async () => {
    getPlayWorld.mockResolvedValue(buildWorldMock());
    const store = {
      ...buildStoreMock(),
      buyHouse: vi.fn(async () => ({
        ok: false as const,
        error: "HOUSE_ALREADY_OWNED" as const,
      })),
    };
    getSessionStore.mockReturnValue(store);
    getRepository.mockResolvedValue(buildMainNodeRepoMock());
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-node-id": "node-main",
          "x-node-passw": "passw-hash",
        },
        body: JSON.stringify({
          op: "buyHouse",
          payload: {
            houseId: 1,
            ownerName: "Alex Kim",
            ownerSignature: "AK",
          },
        }),
      })
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("HOUSE_ALREADY_OWNED");
  });
});
