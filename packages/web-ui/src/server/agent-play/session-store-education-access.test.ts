import { describe, expect, it } from "vitest";
import { TestSessionStore } from "./session-store.test-double.js";

describe("session store education access", () => {
  it("sells a 5 APU day pass per center and keeps them independent", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 10 });

    const first = await store.purchaseEducationAccess({
      playerId: "p1",
      centerId: "foundations-hall",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "edu-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.access.apuCost).toBe(5);
    expect(first.purchase.amenityKind).toBe("education_pass");

    const other = await store.getEducationAccess({
      playerId: "p1",
      centerId: "curriculum-tower",
      now: "2026-10-02T12:00:00.000Z",
    });
    expect(other.access).toBeNull();

    const again = await store.purchaseEducationAccess({
      playerId: "p1",
      centerId: "foundations-hall",
      now: "2026-10-02T15:00:00.000Z",
      recordId: "edu-2",
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.access.centerId).toBe("foundations-hall");
  });
});
