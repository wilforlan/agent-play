import { describe, expect, it } from "vitest";
import {
  PEER_CALL_PROXIMITY_RADIUS,
  type PeerCallRecord,
} from "@agent-play/sdk";
import { TestSessionStore } from "./session-store.test-double.js";

const NOW = "2026-08-12T12:00:00.000Z";
const ANSWERED = "2026-08-12T12:00:05.000Z";
const ENDED = "2026-08-12T12:01:00.000Z";

const joinNearPeers = async (
  store: TestSessionStore,
  options?: { calleeOffset?: number }
): Promise<void> => {
  const offset = options?.calleeOffset ?? 0.1;
  await store.joinGeographyMember({
    humanId: "caller-1",
    name: "Caller",
    x: 0,
    y: 0,
    joinedAt: 1,
    coarseRevisedAt: 1,
  });
  await store.joinGeographyMember({
    humanId: "callee-1",
    name: "Callee",
    x: offset,
    y: 0,
    joinedAt: 1,
    coarseRevisedAt: 1,
  });
};

describe("session-store: peer call lifecycle", () => {
  it("invite creates a ringing call indexed by both humans", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({
      playerId: "caller-1",
      balanceUsd: 5,
    });
    await joinNearPeers(store);

    const invite = await store.invitePeerCall({
      callerId: "caller-1",
      calleeId: "callee-1",
      now: NOW,
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) {
      return;
    }
    expect(invite.call.status).toBe("ringing");
    expect(invite.call.callerId).toBe("caller-1");
    expect(invite.call.calleeId).toBe("callee-1");
    expect(invite.call.createdAt).toBe(NOW);

    const loaded = await store.getPeerCall(invite.call.callId);
    expect(loaded).toEqual(invite.call);
    expect(await store.getPeerCallIdForHuman("caller-1")).toBe(
      invite.call.callId
    );
    expect(await store.getPeerCallIdForHuman("callee-1")).toBe(
      invite.call.callId
    );
  });

  it("rejects a second invite while either party is busy", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({
      playerId: "caller-1",
      balanceUsd: 5,
    });
    await store.setPlayerWalletBalance({
      playerId: "caller-2",
      balanceUsd: 5,
    });
    await joinNearPeers(store);
    await store.joinGeographyMember({
      humanId: "caller-2",
      name: "Caller Two",
      x: 0.05,
      y: 0,
      joinedAt: 1,
      coarseRevisedAt: 1,
    });

    const first = await store.invitePeerCall({
      callerId: "caller-1",
      calleeId: "callee-1",
      now: NOW,
    });
    expect(first.ok).toBe(true);

    const second = await store.invitePeerCall({
      callerId: "caller-2",
      calleeId: "callee-1",
      now: NOW,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toBe("BUSY");
    }
  });

  it("rejects invite when coarse distance exceeds proximity radius", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({
      playerId: "caller-1",
      balanceUsd: 5,
    });
    await joinNearPeers(store, {
      calleeOffset: PEER_CALL_PROXIMITY_RADIUS + 0.01,
    });

    const invite = await store.invitePeerCall({
      callerId: "caller-1",
      calleeId: "callee-1",
      now: NOW,
    });
    expect(invite.ok).toBe(false);
    if (!invite.ok) {
      expect(invite.error).toBe("TOO_FAR");
    }
  });

  it("rejects invite when caller wallet balance is zero", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({
      playerId: "caller-1",
      balanceUsd: 0,
    });
    await joinNearPeers(store);

    const invite = await store.invitePeerCall({
      callerId: "caller-1",
      calleeId: "callee-1",
      now: NOW,
    });
    expect(invite.ok).toBe(false);
    if (!invite.ok) {
      expect(invite.error).toBe("INSUFFICIENT_FUNDS");
    }
  });

  it("decline transitions ringing to declined and clears indexes", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({
      playerId: "caller-1",
      balanceUsd: 5,
    });
    await joinNearPeers(store);
    const invite = await store.invitePeerCall({
      callerId: "caller-1",
      calleeId: "callee-1",
      now: NOW,
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) {
      return;
    }

    const declined = await store.transitionPeerCall({
      callId: invite.call.callId,
      fromStatus: "ringing",
      toStatus: "declined",
      endedAt: ANSWERED,
      endReason: "decline",
    });
    expect(declined.ok).toBe(true);
    if (declined.ok) {
      expect(declined.call.status).toBe("declined");
      expect(declined.call.endReason).toBe("decline");
    }

    await store.clearPeerCall(invite.call.callId);
    expect(await store.getPeerCall(invite.call.callId)).toBeNull();
    expect(await store.getPeerCallIdForHuman("caller-1")).toBeNull();
    expect(await store.getPeerCallIdForHuman("callee-1")).toBeNull();
  });

  it("accept transitions ringing to active and hangup ends the call", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({
      playerId: "caller-1",
      balanceUsd: 5,
    });
    await joinNearPeers(store);
    const invite = await store.invitePeerCall({
      callerId: "caller-1",
      calleeId: "callee-1",
      now: NOW,
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) {
      return;
    }

    const accepted = await store.transitionPeerCall({
      callId: invite.call.callId,
      fromStatus: "ringing",
      toStatus: "active",
      answeredAt: ANSWERED,
    });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.call.status).toBe("active");
      expect(accepted.call.answeredAt).toBe(ANSWERED);
    }

    const hungUp = await store.transitionPeerCall({
      callId: invite.call.callId,
      fromStatus: "active",
      toStatus: "ended",
      endedAt: ENDED,
      endReason: "hangup",
    });
    expect(hungUp.ok).toBe(true);
    if (hungUp.ok) {
      expect(hungUp.call.status).toBe("ended");
      expect(hungUp.call.endReason).toBe("hangup");
    }

    await store.clearPeerCall(invite.call.callId);
    expect(await store.getPeerCallIdForHuman("caller-1")).toBeNull();
  });

  it("createPeerCall rejects when a party already has a call index", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const first: PeerCallRecord = {
      callId: "call-a",
      sid: store.getSessionId(),
      callerId: "caller-1",
      calleeId: "callee-1",
      status: "ringing",
      createdAt: NOW,
    };
    const created = await store.createPeerCall(first);
    expect(created.ok).toBe(true);

    const second = await store.createPeerCall({
      callId: "call-b",
      sid: store.getSessionId(),
      callerId: "caller-1",
      calleeId: "callee-2",
      status: "ringing",
      createdAt: NOW,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toBe("BUSY");
    }
  });
});
