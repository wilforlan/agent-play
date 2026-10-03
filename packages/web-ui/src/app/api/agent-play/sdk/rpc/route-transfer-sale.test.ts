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

describe("POST /api/agent-play/sdk/rpc — transfer sale", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    validateAgentPlaySession.mockResolvedValue(true);
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => ({ spaces: [] })),
    });
  });

  it("routes purchase to executeTransferPurchase when item is listed", async () => {
    const executeTransferPurchase = vi.fn(async () => ({
      ok: true as const,
      buyerRecord: {
        id: "xfer-buy",
        playerId: "buyer",
        spaceId: "space-1",
        amenityKind: "shop" as const,
        itemRef: { kind: "shop" as const, id: "shop-1" },
        priceUsd: 20,
        feeUsd: 0.3,
        saleKind: "transfer" as const,
        at: "2026-05-12T03:00:00.000Z",
        detail: "Transfer sale",
      },
      sellerRecord: {
        id: "xfer-sell",
        playerId: "seller",
        spaceId: "space-1",
        amenityKind: "shop" as const,
        itemRef: { kind: "shop" as const, id: "shop-1" },
        priceUsd: 19.7,
        feeUsd: 0.3,
        saleKind: "transfer" as const,
        at: "2026-05-12T03:00:00.000Z",
        detail: "Transfer sale proceeds",
      },
      buyerWallet: {
        playerId: "buyer",
        balanceUsd: 30,
        currency: "USD" as const,
        updatedAt: "2026-05-12T03:00:00.000Z",
      },
      sellerWallet: {
        playerId: "seller",
        balanceUsd: 34.7,
        currency: "USD" as const,
        updatedAt: "2026-05-12T03:00:00.000Z",
      },
      updatedItem: {
        id: "shop-1",
        spaceId: "space-1",
        type: "book" as const,
        name: "Book",
        description: "d",
        priceUsd: 5,
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: {
          status: "sold" as const,
          soldToPlayerId: "buyer",
          soldAt: "2026-05-12T03:00:00.000Z",
        },
      },
      feeUsd: 0.3,
      sellerCreditUsd: 19.7,
    }));
    const executePurchase = vi.fn();
    const store = {
      getSessionId: vi.fn(() => "s1"),
      listShopItems: vi.fn(async () => [
        {
          id: "shop-1",
          spaceId: "space-1",
          type: "book",
          name: "Book",
          description: "d",
          priceUsd: 5,
          createdAt: "2026-05-12T00:00:00.000Z",
          sale: {
            status: "transfer_available",
            soldToPlayerId: "seller",
            soldAt: "2026-05-12T01:00:00.000Z",
            transferListing: {
              listingId: "listing-1",
              sellerPlayerId: "seller",
              priceUsd: 20,
              listedAt: "2026-05-12T02:00:00.000Z",
              updatedAt: "2026-05-12T02:00:00.000Z",
            },
          },
        },
      ]),
      executePurchase,
      executeTransferPurchase,
      appendSpaceAmenityLog: vi.fn(async () => undefined),
      publishWorldFanout: vi.fn(async () => undefined),
      persistSnapshotReturningRev: vi.fn(async () => ({
        rev: 2,
        merkleRootHex: "deadbeef",
        merkleLeafCount: 1,
      })),
      getPlayerWallet: vi.fn(async () => ({
        playerId: "buyer",
        balanceUsd: 30,
        currency: "USD",
        updatedAt: "2026-05-12T03:00:00.000Z",
      })),
    };
    getSessionStore.mockReturnValue(store);

    const res = await post("purchase", {
      playerId: "buyer",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "shop-1" },
    });
    expect(res.status).toBe(200);
    expect(executeTransferPurchase).toHaveBeenCalled();
    expect(executePurchase).not.toHaveBeenCalled();
    const body = (await res.json()) as {
      saleKind: string;
      feeUsd: number;
      purchase: { detail?: string };
    };
    expect(body.saleKind).toBe("transfer");
    expect(body.feeUsd).toBe(0.3);
    expect(body.purchase.detail).toBe("Transfer sale");
  });

  it("creates a transfer listing for the owner", async () => {
    const createTransferListing = vi.fn(async () => ({
      ok: true as const,
      item: {
        id: "shop-1",
        spaceId: "space-1",
        type: "book" as const,
        name: "Book",
        description: "d",
        priceUsd: 5,
        createdAt: "2026-05-12T00:00:00.000Z",
        sale: {
          status: "transfer_available" as const,
          soldToPlayerId: "seller",
          soldAt: "2026-05-12T01:00:00.000Z",
          transferListing: {
            listingId: "listing-1",
            sellerPlayerId: "seller",
            priceUsd: 12,
            listedAt: "2026-05-12T02:00:00.000Z",
            updatedAt: "2026-05-12T02:00:00.000Z",
          },
        },
      },
    }));
    const store = {
      getSessionId: vi.fn(() => "s1"),
      createTransferListing,
      publishWorldFanout: vi.fn(async () => undefined),
      persistSnapshotReturningRev: vi.fn(async () => ({
        rev: 2,
        merkleRootHex: "deadbeef",
        merkleLeafCount: 1,
      })),
    };
    getSessionStore.mockReturnValue(store);

    const res = await post("createTransferListing", {
      playerId: "seller",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "shop-1" },
      priceUsd: 12,
    });
    expect(res.status).toBe(200);
    expect(createTransferListing).toHaveBeenCalled();
    const body = (await res.json()) as {
      item: { sale: { status: string } };
    };
    expect(body.item.sale.status).toBe("transfer_available");
  });
});
