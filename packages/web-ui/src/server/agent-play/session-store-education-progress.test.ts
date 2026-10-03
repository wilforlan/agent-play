import { describe, expect, it } from "vitest";
import { TestSessionStore } from "./session-store.test-double.js";

describe("session store education progress", () => {
  it("records ungraded lesson completion when day pass and tuition are active", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 2000 });

    const gate = await store.purchaseEducationAccess({
      playerId: "p1",
      centerId: "faculty-science",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "gate-progress-1",
    });
    expect(gate.ok).toBe(true);

    const tuition = await store.purchaseEducationTuition({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      now: "2026-10-02T12:05:00.000Z",
      recordId: "tuition-progress-1",
    });
    expect(tuition.ok).toBe(true);

    const recorded = await store.recordEducationLessonComplete({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      lessonId: "sci-computer-modeling/05-model-critique",
      now: "2026-10-02T12:10:00.000Z",
      reflection: "I will check assumptions next.",
    });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(recorded.progress.lessonId).toBe(
      "sci-computer-modeling/05-model-critique"
    );
    expect(recorded.progress.reflection).toBe(
      "I will check assumptions next."
    );

    const listed = await store.getEducationProgress({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
    });
    expect(listed.progress).toHaveLength(1);
    expect(listed.progress[0]?.lessonId).toBe(
      "sci-computer-modeling/05-model-critique"
    );
  });

  it("is idempotent and requires enrollment", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 2000 });

    const blocked = await store.recordEducationLessonComplete({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      lessonId: "sci-computer-modeling/01-algorithms-pseudocode",
      now: "2026-10-02T12:00:00.000Z",
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe("DAY_PASS_REQUIRED");

    await store.purchaseEducationAccess({
      playerId: "p1",
      centerId: "faculty-science",
      now: "2026-10-02T12:00:00.000Z",
      recordId: "gate-progress-2",
    });
    const notEnrolled = await store.recordEducationLessonComplete({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      lessonId: "sci-computer-modeling/01-algorithms-pseudocode",
      now: "2026-10-02T12:01:00.000Z",
    });
    expect(notEnrolled.ok).toBe(false);
    if (notEnrolled.ok) return;
    expect(notEnrolled.error).toBe("NOT_ENROLLED");

    await store.purchaseEducationTuition({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      now: "2026-10-02T12:05:00.000Z",
      recordId: "tuition-progress-2",
    });
    const first = await store.recordEducationLessonComplete({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      lessonId: "sci-computer-modeling/01-algorithms-pseudocode",
      now: "2026-10-02T12:10:00.000Z",
      reflection: "first",
    });
    const second = await store.recordEducationLessonComplete({
      playerId: "p1",
      facultyId: "faculty-science",
      pathId: "sci-computer-modeling",
      lessonId: "sci-computer-modeling/01-algorithms-pseudocode",
      now: "2026-10-02T12:11:00.000Z",
      reflection: "second",
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.progress.completedAt).toBe(first.progress.completedAt);
    expect(second.progress.reflection).toBe("first");
  });
});
