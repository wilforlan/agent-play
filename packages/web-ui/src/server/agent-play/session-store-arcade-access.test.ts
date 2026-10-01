import { beforeEach, describe, expect, it } from "vitest";
import { TestSessionStore } from "./session-store.test-double.js";

describe("arcade access purchase", () => {
  let store: TestSessionStore;

  beforeEach(async () => {
    store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.0664875);
  });

  it("quotes day and week APW$ from the live rate", async () => {
    const result = await store.getArcadeAccess({
      playerId: "p1",
      now: "2026-06-10T12:00:00.000Z",
    });
    expect(result.access).toBeNull();
    expect(result.quotes.day).toBe(1.6621875);
    expect(result.quotes.week).toBe(9.30825);
    expect(result.preferredTender).toBe("apw");
  });

  it("debits APW$ when cash wealth is higher", async () => {
    const result = await store.purchaseArcadeAccess({
      playerId: "p1",
      plan: "day",
      now: "2026-06-10T12:00:00.000Z",
      recordId: "pass-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tender).toBe("apw");
    expect(result.wallet.balanceUsd).toBeCloseTo(10 - 1.6621875, 6);
    expect(result.wallet.powerUps ?? 0).toBe(0);
    expect(result.purchase.amenityKind).toBe("arcade_pass");
    expect(result.purchase.powerUpsDelta).toBeUndefined();
    expect(result.access.plan).toBe("day");
    expect(result.access.expiresAt).toBe("2026-06-11T12:00:00.000Z");
  });

  it("debits APU when APU wealth is higher and burns APU", async () => {
    await store.addPowerUps({
      playerId: "p1",
      amount: 200,
      now: "2026-06-10T12:00:00.000Z",
    });
    await store.setPlayerWalletBalance({
      playerId: "p1",
      balanceUsd: 1,
    });
    const result = await store.purchaseArcadeAccess({
      playerId: "p1",
      plan: "day",
      now: "2026-06-10T12:00:00.000Z",
      recordId: "pass-2",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tender).toBe("apu");
    expect(result.wallet.powerUps).toBe(175);
    expect(result.purchase.powerUpsDelta).toBe(-25);
    expect(result.purchase.token).toBe("APU");
  });

  it("falls back to the other tender when preferred cannot cover", async () => {
    await store.addPowerUps({
      playerId: "p1",
      amount: 10,
      now: "2026-06-10T12:00:00.000Z",
    });
    await store.setPlayerWalletBalance({
      playerId: "p1",
      balanceUsd: 0.5,
    });
    const missing = await store.purchaseArcadeAccess({
      playerId: "p1",
      plan: "day",
      now: "2026-06-10T12:00:00.000Z",
      recordId: "pass-3",
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error).toBe("INSUFFICIENT_FUNDS");

    await store.setPlayerWalletBalance({
      playerId: "p1",
      balanceUsd: 5,
    });
    const ok = await store.purchaseArcadeAccess({
      playerId: "p1",
      plan: "day",
      now: "2026-06-10T12:00:00.000Z",
      recordId: "pass-4",
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.tender).toBe("apw");
  });

  it("does not double-charge while a pass is active", async () => {
    const first = await store.purchaseArcadeAccess({
      playerId: "p1",
      plan: "week",
      now: "2026-06-10T12:00:00.000Z",
      recordId: "pass-5",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const balanceAfter = first.wallet.balanceUsd;
    const second = await store.purchaseArcadeAccess({
      playerId: "p1",
      plan: "day",
      now: "2026-06-11T12:00:00.000Z",
      recordId: "pass-6",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.wallet.balanceUsd).toBe(balanceAfter);
    expect(second.access.plan).toBe("week");
  });

  it("expires the day pass after 24 hours", async () => {
    await store.purchaseArcadeAccess({
      playerId: "p1",
      plan: "day",
      now: "2026-06-10T12:00:00.000Z",
      recordId: "pass-7",
    });
    const stillActive = await store.getArcadeAccess({
      playerId: "p1",
      now: "2026-06-11T11:59:59.000Z",
    });
    expect(stillActive.access).not.toBeNull();
    const expired = await store.getArcadeAccess({
      playerId: "p1",
      now: "2026-06-11T12:00:00.000Z",
    });
    expect(expired.access).toBeNull();
  });
});
