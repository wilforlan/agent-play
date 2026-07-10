import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getSharedRedisClient, getScannerTx } = vi.hoisted(() => ({
  getSharedRedisClient: vi.fn(),
  getScannerTx: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getSharedRedisClient,
}));

vi.mock("@/server/scanner/scanner-indexer", () => ({
  getScannerTx,
}));

import { GET } from "./route.js";

describe("GET /api/scanner/txs/[id]", () => {
  beforeEach(() => {
    getSharedRedisClient.mockReset();
    getScannerTx.mockReset();
  });

  it("returns 503 when redis is not configured", async () => {
    getSharedRedisClient.mockReturnValue(null);
    const res = await GET(new NextRequest("http://localhost/api/scanner/txs/tx-1"), {
      params: Promise.resolve({ id: "tx-1" }),
    });
    expect(res.status).toBe(503);
  });

  it("returns 404 for unknown transaction", async () => {
    getSharedRedisClient.mockReturnValue({} as never);
    getScannerTx.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/scanner/txs/tx-1"), {
      params: Promise.resolve({ id: "tx-1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns the indexed transaction", async () => {
    getSharedRedisClient.mockReturnValue({} as never);
    getScannerTx.mockResolvedValue({
      id: "pur-ab85411b-de00-4309-a95f-5aca565a1662",
      playerId: "node-1",
      spaceId: "space-1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "item-1" },
      priceUsd: 7,
      at: "2026-01-01T00:00:00.000Z",
      hostId: "default",
      indexedAt: "2026-01-01T00:00:01.000Z",
      op: "purchase",
    });
    const res = await GET(
      new NextRequest(
        "http://localhost/api/scanner/txs/pur-ab85411b-de00-4309-a95f-5aca565a1662"
      ),
      {
        params: Promise.resolve({ id: "pur-ab85411b-de00-4309-a95f-5aca565a1662" }),
      }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tx?: { id: string } };
    expect(body.tx?.id).toBe("pur-ab85411b-de00-4309-a95f-5aca565a1662");
  });
});
