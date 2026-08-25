import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PeerCallRecord } from "@agent-play/sdk";

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

const ringingCall = (overrides?: Partial<PeerCallRecord>): PeerCallRecord => ({
  callId: "call-1",
  sid: "s1",
  callerId: "caller-1",
  calleeId: "callee-1",
  status: "ringing",
  createdAt: "2026-08-12T12:00:00.000Z",
  ...overrides,
});

describe("POST /api/agent-play/sdk/rpc peer call ops", () => {
  beforeEach(() => {
    getPlayWorld.mockReset();
    getSessionStore.mockReset();
    getRepository.mockReset();
    validateAgentPlaySession.mockReset();
    getPlayWorld.mockResolvedValue({});
    getRepository.mockResolvedValue(null);
    validateAgentPlaySession.mockResolvedValue(true);
  });

  it("peerCallInvite creates a call and fans out invite notification", async () => {
    const call = ringingCall();
    const store = {
      getSnapshotRev: vi.fn(async () => 10),
      publishWorldFanout: vi.fn(async () => {}),
      invitePeerCall: vi.fn(async () => ({ ok: true as const, call })),
    };
    getSessionStore.mockReturnValue(store);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "peerCallInvite",
          payload: { callerId: "caller-1", calleeId: "callee-1" },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; call: PeerCallRecord };
    expect(body.ok).toBe(true);
    expect(body.call.callId).toBe("call-1");
    expect(store.invitePeerCall).toHaveBeenCalled();
    expect(store.publishWorldFanout).toHaveBeenCalled();
    const fanout = store.publishWorldFanout.mock.calls[0];
    expect(fanout?.[1]).toBe("world:intercom");
    const payload = fanout?.[2] as {
      result: { notification: { kind: string; targetPlayerId: string } };
    };
    expect(payload.result.notification.kind).toBe("peer_call_invite");
    expect(payload.result.notification.targetPlayerId).toBe("callee-1");
  });

  it("peerCallDecline transitions, notifies caller, and clears", async () => {
    const call = ringingCall();
    const store = {
      getSnapshotRev: vi.fn(async () => 10),
      publishWorldFanout: vi.fn(async () => {}),
      getPeerCall: vi.fn(async () => call),
      transitionPeerCall: vi.fn(async () => ({
        ok: true as const,
        call: { ...call, status: "declined" as const, endReason: "decline" as const },
      })),
      clearPeerCall: vi.fn(async () => {}),
    };
    getSessionStore.mockReturnValue(store);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "peerCallDecline",
          payload: { callId: "call-1", calleeId: "callee-1" },
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(store.transitionPeerCall).toHaveBeenCalled();
    expect(store.clearPeerCall).toHaveBeenCalledWith("call-1");
    expect(store.publishWorldFanout).toHaveBeenCalled();
    const fanout = store.publishWorldFanout.mock.calls[0];
    const payload = fanout?.[2] as {
      result: { notification: { kind: string; targetPlayerId: string } };
    };
    expect(payload.result.notification.kind).toBe("peer_call_declined");
    expect(payload.result.notification.targetPlayerId).toBe("caller-1");
  });

  it("peerCallAccept activates call and starts peer talk billing", async () => {
    const call = ringingCall();
    const store = {
      getSnapshotRev: vi.fn(async () => 10),
      publishWorldFanout: vi.fn(async () => {}),
      getPeerCall: vi.fn(async () => call),
      transitionPeerCall: vi.fn(async () => ({
        ok: true as const,
        call: {
          ...call,
          status: "active" as const,
          answeredAt: "2026-08-12T12:00:05.000Z",
        },
      })),
      startPeerTalkSession: vi.fn(async () => ({
        ok: true as const,
        startedAt: "2026-08-12T12:00:05.000Z",
        ratePerSecondUsd: 0.002,
        wallet: {
          playerId: "caller-1",
          balanceUsd: 5,
          updatedAt: "2026-08-12T12:00:05.000Z",
        },
      })),
    };
    getSessionStore.mockReturnValue(store);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "peerCallAccept",
          payload: { callId: "call-1", calleeId: "callee-1" },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      billing?: { ok?: boolean; wallet?: unknown };
    };
    expect(body.ok).toBe(true);
    expect(body.billing?.ok).toBe(true);
    expect(body.billing).not.toHaveProperty("wallet");
    expect(store.startPeerTalkSession).toHaveBeenCalledWith(
      expect.objectContaining({
        callerId: "caller-1",
        calleeId: "callee-1",
        callId: "call-1",
      })
    );
  });

  it("peerCallAccept returns billing errors without a wallet", async () => {
    const call = ringingCall();
    const store = {
      getSnapshotRev: vi.fn(async () => 10),
      publishWorldFanout: vi.fn(async () => {}),
      getPeerCall: vi.fn(async () => call),
      transitionPeerCall: vi.fn(async () => ({
        ok: true as const,
        call: {
          ...call,
          status: "active" as const,
          answeredAt: "2026-08-12T12:00:05.000Z",
        },
      })),
      startPeerTalkSession: vi.fn(async () => ({
        ok: false as const,
        error: "INSUFFICIENT_FUNDS" as const,
      })),
    };
    getSessionStore.mockReturnValue(store);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "peerCallAccept",
          payload: { callId: "call-1", calleeId: "callee-1" },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      billing?: { ok?: boolean; error?: string; wallet?: unknown };
    };
    expect(body.ok).toBe(true);
    expect(body.billing).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
  });

  it("peerCallHangup stops billing when active and clears", async () => {
    const call = ringingCall({
      status: "active",
      answeredAt: "2026-08-12T12:00:05.000Z",
    });
    const store = {
      getSnapshotRev: vi.fn(async () => 10),
      publishWorldFanout: vi.fn(async () => {}),
      getPeerCall: vi.fn(async () => call),
      stopPeerTalkSession: vi.fn(async () => ({
        ok: true as const,
        totalCostUsd: 0.02,
        secondsBilledTotal: 10,
        wallet: {
          playerId: "caller-1",
          balanceUsd: 4.98,
          updatedAt: "2026-08-12T12:01:00.000Z",
        },
      })),
      transitionPeerCall: vi.fn(async () => ({
        ok: true as const,
        call: { ...call, status: "ended" as const, endReason: "hangup" as const },
      })),
      clearPeerCall: vi.fn(async () => {}),
    };
    getSessionStore.mockReturnValue(store);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "peerCallHangup",
          payload: { callId: "call-1", actorId: "caller-1" },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      billing?: { ok?: boolean; wallet?: { playerId?: string } };
    };
    expect(body.ok).toBe(true);
    expect(body.billing?.ok).toBe(true);
    expect(body.billing?.wallet?.playerId).toBe("caller-1");
    expect(store.stopPeerTalkSession).toHaveBeenCalled();
    expect(store.clearPeerCall).toHaveBeenCalledWith("call-1");
  });

  it("peerCallHangup as callee omits the caller wallet", async () => {
    const call = ringingCall({
      status: "active",
      answeredAt: "2026-08-12T12:00:05.000Z",
    });
    const store = {
      getSnapshotRev: vi.fn(async () => 10),
      publishWorldFanout: vi.fn(async () => {}),
      getPeerCall: vi.fn(async () => call),
      stopPeerTalkSession: vi.fn(async () => ({
        ok: true as const,
        totalCostUsd: 0.02,
        secondsBilledTotal: 10,
        wallet: {
          playerId: "caller-1",
          balanceUsd: 4.98,
          updatedAt: "2026-08-12T12:01:00.000Z",
        },
      })),
      transitionPeerCall: vi.fn(async () => ({
        ok: true as const,
        call: { ...call, status: "ended" as const, endReason: "hangup" as const },
      })),
      clearPeerCall: vi.fn(async () => {}),
    };
    getSessionStore.mockReturnValue(store);

    const res = await POST(
      new NextRequest("http://localhost/api/agent-play/sdk/rpc?sid=s1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "peerCallHangup",
          payload: { callId: "call-1", actorId: "callee-1" },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      billing?: { ok?: boolean; wallet?: unknown };
    };
    expect(body.ok).toBe(true);
    expect(body.billing?.ok).toBe(true);
    expect(body.billing).not.toHaveProperty("wallet");
    expect(store.stopPeerTalkSession).toHaveBeenCalled();
    expect(store.clearPeerCall).toHaveBeenCalledWith("call-1");
  });
});
