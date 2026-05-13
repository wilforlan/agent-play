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

describe("POST /api/agent-play/sdk/rpc — per-player wallets", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("returns independent balances for two distinct playerIds", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({
      playerId: "node-alice",
      balanceUsd: 11,
    });
    await store.setPlayerWalletBalance({
      playerId: "node-bob",
      balanceUsd: 22,
    });
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => ({
        sid: "s1",
        worldMap: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, occupants: [] },
        spaces: [],
      })),
    });

    const resA = await post("getPlayerWallet", { playerId: "node-alice" });
    const resB = await post("getPlayerWallet", { playerId: "node-bob" });
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const bodyA = (await resA.json()) as { wallet: { balanceUsd: number } };
    const bodyB = (await resB.json()) as { wallet: { balanceUsd: number } };
    expect(bodyA.wallet.balanceUsd).toBe(11);
    expect(bodyB.wallet.balanceUsd).toBe(22);
  });
});
