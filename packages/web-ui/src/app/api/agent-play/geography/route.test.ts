import { describe, expect, it } from "vitest";
import { TestSessionStore } from "@/server/agent-play/session-store.test-double";
import type { WorldFanoutMessage } from "@/server/agent-play/redis-world-fanout.js";
import {
  parseGeographyHumanState,
  publishGeographyFanout,
} from "@/server/agent-play/world-geography.js";
import { subscribeWorldFanout } from "@/server/agent-play/world-fanout-subscriber.js";

describe("geography fanout", () => {
  it("publishes world:geography with playerChainNotify without snapshot persist", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const received: WorldFanoutMessage[] = [];
    const unsub = subscribeWorldFanout((m) => {
      received.push(m);
    });

    const state = parseGeographyHumanState({
      id: "node-1",
      name: "One",
      x: 1,
      y: 2,
    });
    const { prev, next } = await store.upsertGeographyHuman(state);
    await publishGeographyFanout({
      store,
      prev,
      next,
      data: { humanId: "node-1", action: "join" },
    });

    expect(received.length).toBe(1);
    const msg = received[0];
    expect(msg?.event).toBe("world:geography");
    expect(
      msg?.playerChainNotify?.nodes.some((n) => n.stableKey === "human:node-1")
    ).toBe(true);
    unsub();
  });
});
