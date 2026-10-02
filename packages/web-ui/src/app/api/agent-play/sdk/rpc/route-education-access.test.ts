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

describe("POST /api/agent-play/sdk/rpc — education access", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => null),
    } as never);
  });

  it("returns quotes from getEducationAccess", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.0664875);
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("getEducationAccess", {
      playerId: "p1",
      centerId: "foundations-hall",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      access: null;
      apuCost: number;
      quoteApw: number;
      preferredTender: string;
    };
    expect(body.access).toBeNull();
    expect(body.apuCost).toBe(5);
    expect(body.quoteApw).toBeCloseTo(0.3324375);
    expect(body.preferredTender).toBe("apw");
  });

  it("purchases a day pass for a center", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.0664875);
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("purchaseEducationAccess", {
      playerId: "p1",
      centerId: "curriculum-tower",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tender: string;
      access: { centerId: string; apuCost: number };
      purchase: { amenityKind: string };
    };
    expect(body.tender).toBe("apw");
    expect(body.access.centerId).toBe("curriculum-tower");
    expect(body.access.apuCost).toBe(5);
    expect(body.purchase.amenityKind).toBe("education_pass");
  });

  it("rejects unknown center ids", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("purchaseEducationAccess", {
      playerId: "p1",
      centerId: "not-a-center",
    });
    expect(res.status).toBe(400);
  });

  it("returns 409 INSUFFICIENT_FUNDS when wallet cannot pay", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.0664875);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 0.01 });
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const res = await post("purchaseEducationAccess", {
      playerId: "p1",
      centerId: "assessment-atelier",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INSUFFICIENT_FUNDS");
  });
});
