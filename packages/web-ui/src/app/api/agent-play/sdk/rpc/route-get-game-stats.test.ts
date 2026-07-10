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

describe("POST /api/agent-play/sdk/rpc — getGameStats", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => null),
    } as never);
  });

  it("returns 400 for missing playerId", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("getGameStats", {});
    expect(res.status).toBe(400);
  });

  it("returns empty stats for a new player", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("getGameStats", { playerId: "player-1" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      stats: { dayStreak: number; gamesPlayedToday: number; featuredGameId: string };
    };
    expect(body.stats.dayStreak).toBe(0);
    expect(body.stats.gamesPlayedToday).toBe(0);
    expect(typeof body.stats.featuredGameId).toBe("string");
  });
});
