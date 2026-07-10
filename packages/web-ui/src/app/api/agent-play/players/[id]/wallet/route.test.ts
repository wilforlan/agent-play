import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionStore, validateAgentPlaySession } = vi.hoisted(() => ({
  getSessionStore: vi.fn(),
  validateAgentPlaySession: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getSessionStore,
}));

vi.mock("@/server/agent-play/session-validation", () => ({
  validateAgentPlaySession,
}));

import { GET } from "./route.js";

describe("GET /api/agent-play/players/[id]/wallet", () => {
  beforeEach(() => {
    getSessionStore.mockReset();
    validateAgentPlaySession.mockReset();
  });

  it("returns the wallet for a valid sid + player id", async () => {
    validateAgentPlaySession.mockResolvedValue(true);
    getSessionStore.mockReturnValue({
      getPlayerWallet: vi.fn(async () => ({
        playerId: "p1",
        balanceUsd: 10,
        currency: "USD",
        updatedAt: "2026-05-12T00:00:00.000Z",
      })),
    });

    const req = new NextRequest(
      "http://localhost/api/agent-play/players/p1/wallet?sid=s1"
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      wallet: { playerId: string; balanceUsd: number };
    };
    expect(body.wallet.balanceUsd).toBe(10);
    expect(body.wallet.playerId).toBe("p1");
  });

  it("returns 400 when sid is missing", async () => {
    const req = new NextRequest(
      "http://localhost/api/agent-play/players/p1/wallet"
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when sid is invalid", async () => {
    validateAgentPlaySession.mockResolvedValue(false);
    const req = new NextRequest(
      "http://localhost/api/agent-play/players/p1/wallet?sid=bad"
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(403);
  });
});
