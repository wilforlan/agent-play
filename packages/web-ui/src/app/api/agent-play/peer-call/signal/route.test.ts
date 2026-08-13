import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getPlayWorld,
  getSessionStore,
  validateAgentPlaySession,
} = vi.hoisted(() => ({
  getPlayWorld: vi.fn(),
  getSessionStore: vi.fn(),
  validateAgentPlaySession: vi.fn(),
}));

vi.mock("@/server/get-world", () => ({
  getPlayWorld,
  getSessionStore,
}));

vi.mock("@/server/agent-play/session-validation", () => ({
  validateAgentPlaySession,
}));

import { POST } from "./route.js";

describe("POST /api/agent-play/peer-call/signal", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({});
    validateAgentPlaySession.mockResolvedValue(true);
  });

  it("rejects signaling when call is not active", async () => {
    getSessionStore.mockReturnValue({
      getPeerCall: vi.fn(async () => ({
        callId: "call-1",
        sid: "s1",
        callerId: "caller-1",
        calleeId: "callee-1",
        status: "ringing",
        createdAt: "2026-08-12T12:00:00.000Z",
      })),
      getSnapshotRev: vi.fn(async () => 1),
      publishWorldFanout: vi.fn(async () => {}),
    });
    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/peer-call/signal?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callId: "call-1",
          fromHumanId: "caller-1",
          toHumanId: "callee-1",
          kind: "offer",
          payload: { type: "offer", sdp: "v=0" },
        }),
      })
    );
    expect(res.status).toBe(404);
  });

  it("fans out signal for an active call party", async () => {
    const publishWorldFanout = vi.fn(async () => {});
    getSessionStore.mockReturnValue({
      getPeerCall: vi.fn(async () => ({
        callId: "call-1",
        sid: "s1",
        callerId: "caller-1",
        calleeId: "callee-1",
        status: "active",
        createdAt: "2026-08-12T12:00:00.000Z",
        answeredAt: "2026-08-12T12:00:05.000Z",
      })),
      getSnapshotRev: vi.fn(async () => 3),
      publishWorldFanout,
    });
    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/peer-call/signal?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callId: "call-1",
          fromHumanId: "caller-1",
          toHumanId: "callee-1",
          kind: "offer",
          payload: { type: "offer", sdp: "v=0" },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(publishWorldFanout).toHaveBeenCalledTimes(1);
    const [rev, event, payload] = publishWorldFanout.mock.calls[0] ?? [];
    expect(rev).toBe(3);
    expect(event).toBe("world:peer-call-signal");
    expect(payload).toEqual(
      expect.objectContaining({
        callId: "call-1",
        kind: "offer",
        fromHumanId: "caller-1",
        toHumanId: "callee-1",
      })
    );
  });
});
