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

describe("POST /api/agent-play/sdk/rpc — applyGameOutcome", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => null),
    } as never);
  });

  it("returns 400 for invalid payload", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("applyGameOutcome", {
      playerId: "p1",
      gameId: "hidden-gems",
    });
    expect(res.status).toBe(400);
  });

  it("applies outcome and returns wallet plus stats", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("applyGameOutcome", {
      playerId: "p1",
      gameId: "hidden-gems",
      roundId: "round-abc",
      events: [{ type: "chest_open", correct: true, tutorial: true }],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      netPu: number;
      wallet: { powerUps: number };
      stats: { gamesPlayedToday: number };
    };
    expect(body.netPu).toBeGreaterThan(0);
    expect(body.wallet.powerUps).toBeGreaterThan(0);
    expect(body.stats.gamesPlayedToday).toBe(1);
  });

  it("returns 409 for duplicate round id", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const payload = {
      playerId: "p1",
      gameId: "hidden-gems",
      roundId: "round-dup",
      events: [{ type: "chest_open", correct: true }],
    };
    await post("applyGameOutcome", payload);
    const second = await post("applyGameOutcome", payload);
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: string };
    expect(body.error).toBe("DUPLICATE_ROUND");
  });
});
