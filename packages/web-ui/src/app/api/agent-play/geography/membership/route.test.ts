import { describe, expect, it } from "vitest";
import { GEOGRAPHY_MEMBER_CAP } from "@agent-play/geography-mesh";
import { TestSessionStore } from "@/server/agent-play/session-store.test-double";
import type { WorldFanoutMessage } from "@/server/agent-play/redis-world-fanout.js";
import {
  computeAllNeighborPayloads,
  publishGeographyMembershipFanout,
  publishGeographyNeighborsFanout,
  publishGeographySignalFanout,
  WORLD_GEOGRAPHY_MEMBERSHIP_EVENT,
  WORLD_GEOGRAPHY_NEIGHBORS_EVENT,
  WORLD_GEOGRAPHY_SIGNAL_EVENT,
} from "@/server/agent-play/geography-membership.js";
import { subscribeWorldFanout } from "@/server/agent-play/world-fanout-subscriber.js";

describe("geography membership signaling", () => {
  it("rejects join when membership cap is reached", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    for (let i = 0; i < GEOGRAPHY_MEMBER_CAP; i += 1) {
      const result = await store.joinGeographyMember({
        humanId: `h${i}`,
        name: `H${i}`,
        x: i,
        y: 0,
        joinedAt: 1,
        coarseRevisedAt: 1,
      });
      expect(result.ok).toBe(true);
    }
    const capped = await store.joinGeographyMember({
      humanId: "overflow",
      name: "Overflow",
      x: 0,
      y: 0,
      joinedAt: 2,
      coarseRevisedAt: 2,
    });
    expect(capped.ok).toBe(false);
    if (!capped.ok) {
      expect(capped.error).toBe("cap_reached");
      expect(capped.cap).toBe(100);
    }
  });

  it("publishes membership, neighbors, and signal fanout events", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const received: WorldFanoutMessage[] = [];
    const unsub = subscribeWorldFanout((m) => {
      received.push(m);
    });

    const join = await store.joinGeographyMember({
      humanId: "a",
      name: "A",
      x: 0,
      y: 0,
      joinedAt: 1,
      coarseRevisedAt: 1,
    });
    expect(join.ok).toBe(true);
    if (!join.ok) {
      unsub();
      return;
    }
    await publishGeographyMembershipFanout({
      store,
      data: { action: "join", humanId: "a", memberCount: 1 },
    });
    await store.joinGeographyMember({
      humanId: "b",
      name: "B",
      x: 1,
      y: 0,
      joinedAt: 1,
      coarseRevisedAt: 1,
    });
    const members = await store.getGeographyMembers();
    const payloads = computeAllNeighborPayloads({ members, nowMs: 1 });
    await publishGeographyNeighborsFanout({ store, payloads });
    await publishGeographySignalFanout({
      store,
      signal: {
        fromHumanId: "a",
        toHumanId: "b",
        kind: "offer",
        payload: { type: "offer", sdp: "x" },
      },
    });

    expect(
      received.some((m) => m.event === WORLD_GEOGRAPHY_MEMBERSHIP_EVENT)
    ).toBe(true);
    expect(
      received.some((m) => m.event === WORLD_GEOGRAPHY_NEIGHBORS_EVENT)
    ).toBe(true);
    expect(received.some((m) => m.event === WORLD_GEOGRAPHY_SIGNAL_EVENT)).toBe(
      true
    );
    unsub();
  });
});
