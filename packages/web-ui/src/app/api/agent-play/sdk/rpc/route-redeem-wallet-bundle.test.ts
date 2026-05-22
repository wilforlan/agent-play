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
import { TestSessionStore } from "@/server/agent-play/session-store.test-double.js";

const post = async (op: string, payload: unknown): Promise<Response> =>
  POST(
    new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op, payload }),
    })
  );

describe("POST /api/agent-play/sdk/rpc — redeemWalletBundle", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => null),
    } as never);
  });

  it("returns 409 INVALID_BUNDLE for unknown bundle id", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("redeemWalletBundle", {
      playerId: "p1",
      bundleId: "bundle-999",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INVALID_BUNDLE");
  });

  it("returns 409 INSUFFICIENT_POWER_UPS when balance too low", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("redeemWalletBundle", {
      playerId: "p1",
      bundleId: "bundle-10",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INSUFFICIENT_POWER_UPS");
  });

  it("redeems bundle and returns wallet plus purchase record", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.addPowerUps({
      playerId: "p1",
      amount: 200,
      now: "2026-01-01T00:00:00.000Z",
    });
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("redeemWalletBundle", {
      playerId: "p1",
      bundleId: "bundle-10",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      wallet: { balanceUsd: number; powerUps: number };
      purchase: { amenityKind: string; powerUpsSpent?: number; priceUsd: number };
    };
    expect(body.wallet.balanceUsd).toBe(80);
    expect(body.wallet.powerUps).toBe(50);
    expect(body.purchase.amenityKind).toBe("wallet_bundle");
    expect(body.purchase.powerUpsSpent).toBe(150);
    expect(body.purchase.priceUsd).toBe(10);

    const listed = await store.listPurchases({ playerId: "p1", limit: 10 });
    expect(listed[0]?.amenityKind).toBe("wallet_bundle");
  });
});
