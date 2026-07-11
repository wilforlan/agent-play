import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  DEFAULT_PARKING_RATES_USD,
  createEmptyParkingStreetContent,
} from "@agent-play/sdk";

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
  const parkingStreet = createEmptyParkingStreetContent();
  return {
    getSessionId: vi.fn(() => "s1"),
    buyParkingTicket: vi.fn(async () => ({
      ok: true as const,
      wallet: {
        playerId: "node-main",
        balanceUsd: 50,
        powerUps: 0,
        currency: "USD" as const,
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
      parkingStreet,
      record: {
        id: "park-1",
        playerId: "node-main",
        spaceId: "__parking__",
        amenityKind: "parking" as const,
        itemRef: { kind: "parking" as const, id: "parking-2-1" },
        priceUsd: DEFAULT_PARKING_RATES_USD["1d"],
        at: "2026-05-12T00:00:00.000Z",
        detail: "Parking 1d bay 2 layer 1",
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

describe("POST /api/agent-play/sdk/rpc — buyParkingTicket", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("resolves repository before verifying node credentials", async () => {
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
          op: "buyParkingTicket",
          payload: {
            bay: 2,
            layer: 1,
            carPurchaseId: "pur-5125b3a1-204c-4e10-9bcc-58d15045f0f7",
            durationTier: "1d",
            displayNick: "Manne",
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { wallet?: { balanceUsd: number } };
    expect(body.wallet?.balanceUsd).toBe(50);
    expect(getRepository).toHaveBeenCalled();
    expect(store.buyParkingTicket).toHaveBeenCalledOnce();
  });
});
