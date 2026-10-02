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

describe("POST /api/agent-play/sdk/rpc — education tuition", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({
      getSnapshotJson: vi.fn(async () => null),
    } as never);
  });

  it("quotes tuition and requires day pass to purchase", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 2000 });
    getSessionStore.mockReturnValue(store);
    validateAgentPlaySession.mockResolvedValue(true);

    const quote = await post("getEducationTuition", {
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-mathematics",
    });
    expect(quote.status).toBe(200);
    const quoteBody = (await quote.json()) as { quoteApw: number };
    expect(quoteBody.quoteApw).toBe(450);

    const blocked = await post("purchaseEducationTuition", {
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-mathematics",
    });
    expect(blocked.status).toBe(409);

    await post("purchaseEducationAccess", {
      playerId: "p1",
      facultyId: "faculty-science",
    });
    const bought = await post("purchaseEducationTuition", {
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-mathematics",
    });
    expect(bought.status).toBe(200);
    const body = (await bought.json()) as {
      enrollment: { pathId: string; apwCharged: number };
      purchase: { amenityKind: string };
    };
    expect(body.enrollment.pathId).toBe("sci-mathematics");
    expect(body.enrollment.apwCharged).toBe(450);
    expect(body.purchase.amenityKind).toBe("education_tuition");
  });
});
