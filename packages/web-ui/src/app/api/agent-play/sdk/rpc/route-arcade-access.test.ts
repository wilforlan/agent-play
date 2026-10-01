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

describe("POST /api/agent-play/sdk/rpc — arcade access", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => null),
    } as never);
  });

  it("returns quotes from getArcadeAccess", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.0664875);
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("getArcadeAccess", { playerId: "p1" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      access: null;
      quotes: { day: number; week: number };
      preferredTender: string;
    };
    expect(body.access).toBeNull();
    expect(body.quotes.day).toBe(1.6621875);
    expect(body.preferredTender).toBe("apw");
  });

  it("purchases a day pass and returns access", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.0664875);
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("purchaseArcadeAccess", {
      playerId: "p1",
      plan: "day",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tender: string;
      access: { plan: string };
      purchase: { amenityKind: string };
    };
    expect(body.tender).toBe("apw");
    expect(body.access.plan).toBe("day");
    expect(body.purchase.amenityKind).toBe("arcade_pass");
  });

  it("returns 409 INSUFFICIENT_FUNDS when wallet cannot pay", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.0664875);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 0.1 });
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("purchaseArcadeAccess", {
      playerId: "p1",
      plan: "week",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INSUFFICIENT_FUNDS");
  });
});
