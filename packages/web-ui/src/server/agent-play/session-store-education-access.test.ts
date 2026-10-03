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
    expect(again.access.facultyId).toBe("faculty-art");
  });

  it("charges APW$ equivalent for day entry when APU is zero", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p2", balanceUsd: 3 });

    const quoted = await store.getEducationAccess({
      playerId: "p2",
      centerId: "faculty-science",
      now: "2026-10-02T12:00:00.000Z",
    });
    expect(quoted.quoteApw).toBe(0.5);
    expect(quoted.preferredTender).toBe("apw");
    expect(quoted.wallet.powerUps ?? 0).toBe(0);

    const bought = await store.purchaseEducationAccess({
      playerId: "p2",
      centerId: "faculty-science",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "edu-apw-1",
    });
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.tender).toBe("apw");
    expect(bought.access.apwCharged).toBe(0.5);
    expect(bought.wallet.balanceUsd).toBeCloseTo(2.5, 8);
    expect(bought.wallet.powerUps ?? 0).toBe(0);
  });

  it("uses the reference APW$/APU rate when the market rate was never set", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await store.setPlayerWalletBalance({ playerId: "p3", balanceUsd: 10 });

    const quoted = await store.getEducationAccess({
      playerId: "p3",
      centerId: "faculty-art",
      now: "2026-10-02T12:00:00.000Z",
    });
    expect(quoted.apwPerApu).toBeGreaterThan(0);
    expect(quoted.quoteApw).toBeGreaterThan(0);
    expect(quoted.preferredTender).toBe("apw");

    const bought = await store.purchaseEducationAccess({
      playerId: "p3",
      centerId: "faculty-art",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "edu-apw-fallback-1",
    });
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.tender).toBe("apw");
    expect(bought.wallet.balanceUsd).toBeCloseTo(10 - bought.access.apwCharged, 8);
  });
});
