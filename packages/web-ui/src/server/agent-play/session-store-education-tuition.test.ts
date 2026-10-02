import { describe, expect, it } from "vitest";
import { TestSessionStore } from "./session-store.test-double.js";

describe("session store education tuition", () => {
  it("requires an active day pass before selling annual school fees", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 1000 });

    const blocked = await store.purchaseEducationTuition({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-mathematics",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "tuition-1",
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe("DAY_PASS_REQUIRED");
  });

  it("sells complexity-priced tuition and keeps path enrollments independent", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 2000 });

    const gate = await store.purchaseEducationAccess({
      playerId: "p1",
      centerId: "faculty-science",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "gate-1",
    });
    expect(gate.ok).toBe(true);

    const foundation = await store.purchaseEducationTuition({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-mathematics",
      now: "2026-10-02T12:05:00.000Z",
      recordId: "tuition-2",
    });
    expect(foundation.ok).toBe(true);
    if (!foundation.ok) return;
    expect(foundation.enrollment.apwCharged).toBe(450);
    expect(foundation.purchase.amenityKind).toBe("education_tuition");

    const advanced = await store.getEducationTuition({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      now: "2026-10-02T12:06:00.000Z",
    });
    expect(advanced.enrollment).toBeNull();
    expect(advanced.quoteApw).toBe(900);
  });

  it("maps legacy center ids to faculty day passes", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 10 });

    const gate = await store.purchaseEducationAccess({
      playerId: "p1",
      centerId: "foundations-hall",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "gate-legacy",
    });
    expect(gate.ok).toBe(true);
    if (!gate.ok) return;
    expect(gate.access.facultyId).toBe("faculty-art");

    const again = await store.getEducationAccess({
      playerId: "p1",
      centerId: "faculty-art",
      now: "2026-10-02T18:00:00.000Z",
    });
    expect(again.access?.facultyId).toBe("faculty-art");
  });
});
