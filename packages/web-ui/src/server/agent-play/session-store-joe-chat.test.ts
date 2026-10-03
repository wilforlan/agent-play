import { describe, expect, it } from "vitest";
import type { JoeModel } from "@agent-play/joe";
import { TestSessionStore } from "./session-store.test-double.js";

describe("session store joe lesson chat", () => {
  const enroll = async (store: TestSessionStore): Promise<void> => {
    store.setApwPerApuRate(0.1);
    await store.setPlayerWalletBalance({ playerId: "p1", balanceUsd: 2000 });
    const gate = await store.purchaseEducationAccess({
      playerId: "p1",
      centerId: "faculty-art",
      now: "2026-10-03T12:00:00.000Z",
      recordId: "gate-joe-1",
    });
    expect(gate.ok).toBe(true);
    const tuition = await store.purchaseEducationTuition({
      playerId: "p1",
      facultyId: "faculty-art",
      pathId: "art-visual-studio",
      now: "2026-10-03T12:05:00.000Z",
      recordId: "tuition-joe-1",
    });
    expect(tuition.ok).toBe(true);
  };

  it("requires day pass and enrollment before chatting with Joe", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    const blocked = await store.sendJoeLessonMessage({
      playerId: "p1",
      facultyId: "faculty-art",
      pathId: "art-visual-studio",
      lessonId: "art-visual-studio/01-seeing-drawing",
      text: "Help me start",
      lessonTitle: "Seeing Before Drawing",
      lessonBody: "Contour and negative space.",
      now: "2026-10-03T12:10:00.000Z",
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe("DAY_PASS_REQUIRED");
  });

  it("persists student and joe turns in Redis-shaped history", async () => {
    const store = new TestSessionStore();
    await store.loadOrCreateSessionId();
    await enroll(store);

    const model: JoeModel = {
      complete: async () =>
        JSON.stringify({
          headline: "Start with contour",
          blocks: [
            {
              kind: "concept",
              body: "Contour and negative space build observational accuracy.",
            },
            { kind: "probe", body: "What edge will you measure first?" },
          ],
          nextMove: "Trace one contour of a cup.",
          relevance: 0.93,
        }),
    };
    store.setJoeModel(model);

    const sent = await store.sendJoeLessonMessage({
      playerId: "p1",
      facultyId: "faculty-art",
      pathId: "art-visual-studio",
      lessonId: "art-visual-studio/01-seeing-drawing",
      text: "How do I start?",
      lessonTitle: "Seeing Before Drawing",
      lessonBody:
        "Contour, negative space, and measurement for observational accuracy. Seeing Before Drawing is a tool.",
      now: "2026-10-03T12:10:00.000Z",
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.thread.messages).toHaveLength(2);
    expect(sent.thread.messages[0]?.role).toBe("student");
    expect(sent.thread.messages[0]?.text).toBe("How do I start?");
    expect(sent.thread.messages[1]?.role).toBe("joe");
    expect(sent.thread.messages[1]?.structured?.headline).toBe(
      "Start with contour"
    );

    const loaded = await store.getJoeLessonChat({
      playerId: "p1",
      facultyId: "faculty-art",
      pathId: "art-visual-studio",
      lessonId: "art-visual-studio/01-seeing-drawing",
    });
    expect(loaded.thread.messages).toHaveLength(2);
  });
});
