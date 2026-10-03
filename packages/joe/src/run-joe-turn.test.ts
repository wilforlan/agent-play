import { describe, expect, it } from "vitest";
import { runJoeTurn } from "./run-joe-turn.js";
import type { JoeModel } from "./joe-model.js";
import type { JoeStructuredReply } from "./schemas.js";

const lesson = {
  facultyId: "faculty-art",
  pathId: "art-visual-studio",
  lessonId: "art-visual-studio/01-seeing-drawing",
  lessonTitle: "Seeing Before Drawing",
  lessonBody:
    "Contour, negative space, and measurement for observational accuracy. Seeing Before Drawing is a tool.",
};

describe("runJoeTurn", () => {
  it("returns a structured joe message grounded in history", async () => {
    const reply: JoeStructuredReply = {
      headline: "Lock onto contour",
      blocks: [
        {
          kind: "concept",
          body: "Contour and negative space train observational accuracy.",
        },
        {
          kind: "probe",
          body: "Which edge did you measure first?",
        },
      ],
      nextMove: "Sketch one contour line of a cup rim.",
      relevance: 0.92,
    };
    const model: JoeModel = {
      complete: async () => JSON.stringify(reply),
    };
    const result = await runJoeTurn({
      lesson,
      history: [
        {
          id: "m1",
          role: "student",
          text: "I do not see negative space yet.",
          createdAt: "2026-10-03T12:00:00.000Z",
        },
      ],
      studentText: "How do I start?",
      model,
      now: "2026-10-03T12:01:00.000Z",
      idFactory: () => "joe-1",
    });
    expect(result.message.role).toBe("joe");
    expect(result.message.structured?.headline).toBe("Lock onto contour");
    expect(result.relevance).toBeGreaterThanOrEqual(0.8);
  });

  it("retries once when relevance is below 0.8", async () => {
    let calls = 0;
    const low: JoeStructuredReply = {
      headline: "Rockets",
      blocks: [{ kind: "concept", body: "Rocket fuel burns hot." }],
      nextMove: "Ignore the lesson.",
      relevance: 0.2,
    };
    const high: JoeStructuredReply = {
      headline: "Return to contour",
      blocks: [
        {
          kind: "concept",
          body: "Contour and negative space restore observational accuracy in Seeing Before Drawing.",
        },
      ],
      nextMove: "Trace one negative-space shape.",
      relevance: 0.9,
    };
    const model: JoeModel = {
      complete: async () => {
        calls += 1;
        return JSON.stringify(calls === 1 ? low : high);
      },
    };
    const result = await runJoeTurn({
      lesson,
      history: [],
      studentText: "Help me.",
      model,
      now: "2026-10-03T12:01:00.000Z",
      idFactory: () => "joe-2",
    });
    expect(calls).toBe(2);
    expect(result.message.structured?.headline).toBe("Return to contour");
    expect(result.relevance).toBeGreaterThanOrEqual(0.8);
  });
});
