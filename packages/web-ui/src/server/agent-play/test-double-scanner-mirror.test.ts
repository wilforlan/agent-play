import { describe, expect, it } from "vitest";
import { TestSessionStore } from "./session-store.test-double.js";
import { ANALYTICS_EVENT_NAMES } from "@agent-play/sdk";

describe("test-double scanner mirror", () => {
  it("indexes purchases and event log entries in memory", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.appendPurchaseRecord({
      id: "rec-1",
      playerId: "p1",
      spaceId: "s1",
      amenityKind: "shop",
      itemRef: { kind: "shop", id: "i1" },
      priceUsd: 5,
      at: "2026-05-12T00:00:00.000Z",
    });
    await store.appendEventLog({
      type: "world:journey",
      at: "2026-05-12T00:01:00.000Z",
      summary: '{"playerId":"p1"}',
    });

    expect(store.scannerMirror.txRecords.get("rec-1")?.playerId).toBe("p1");
    expect(
      store.scannerMirror.analyticsEvents.some(
        (event) => event.event === ANALYTICS_EVENT_NAMES.purchaseCompleted
      )
    ).toBe(true);
    expect(
      store.scannerMirror.analyticsEvents.some(
        (event) => event.event === ANALYTICS_EVENT_NAMES.worldJourneyRecorded
      )
    ).toBe(true);
  });
});
