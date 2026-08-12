import { describe, expect, it } from "vitest";
import {
  PEER_CALL_PROXIMITY_RADIUS,
  PeerCallRecordSchema,
  arePeersWithinCallProximity,
  peerCallDistance,
} from "./peer-call-model.js";

describe("PeerCallRecordSchema", () => {
  it("accepts a ringing call record", () => {
    const parsed = PeerCallRecordSchema.parse({
      callId: "call-1",
      sid: "sid-1",
      callerId: "caller-1",
      calleeId: "callee-1",
      status: "ringing",
      createdAt: "2026-08-12T12:00:00.000Z",
    });
    expect(parsed.status).toBe("ringing");
    expect(parsed.callId).toBe("call-1");
  });

  it("accepts active and ended records with optional fields", () => {
    const active = PeerCallRecordSchema.parse({
      callId: "call-2",
      sid: "sid-1",
      callerId: "a",
      calleeId: "b",
      status: "active",
      createdAt: "2026-08-12T12:00:00.000Z",
      answeredAt: "2026-08-12T12:00:05.000Z",
    });
    expect(active.answeredAt).toBeDefined();

    const ended = PeerCallRecordSchema.parse({
      callId: "call-3",
      sid: "sid-1",
      callerId: "a",
      calleeId: "b",
      status: "ended",
      createdAt: "2026-08-12T12:00:00.000Z",
      answeredAt: "2026-08-12T12:00:05.000Z",
      endedAt: "2026-08-12T12:01:00.000Z",
      endReason: "hangup",
    });
    expect(ended.endReason).toBe("hangup");
  });
});

describe("peer call proximity", () => {
  it("matches DEFAULT play-ui proximity radius constant", () => {
    expect(PEER_CALL_PROXIMITY_RADIUS).toBe(0.72);
  });

  it("accepts peers within radius and rejects beyond", () => {
    expect(
      arePeersWithinCallProximity({
        caller: { x: 0, y: 0 },
        callee: { x: 0.5, y: 0 },
      })
    ).toBe(true);
    expect(
      arePeersWithinCallProximity({
        caller: { x: 0, y: 0 },
        callee: { x: 1, y: 0 },
      })
    ).toBe(false);
    expect(peerCallDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
