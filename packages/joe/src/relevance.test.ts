import { describe, expect, it } from "vitest";
import { scoreJoeLessonRelevance } from "./relevance.js";

describe("scoreJoeLessonRelevance", () => {
  const lessonBody = `
## Why this lesson matters
Contour, negative space, and measurement for observational accuracy.
Treat Seeing Before Drawing as a tool, not a trivia item.
`;

  it("scores high when reply reuses lesson concepts", () => {
    const score = scoreJoeLessonRelevance({
      lessonBody,
      replyText:
        "Focus on contour and negative space. Measurement improves observational accuracy when Seeing Before Drawing.",
    });
    expect(score).toBeGreaterThanOrEqual(0.8);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("scores low when reply drifts off-topic", () => {
    const score = scoreJoeLessonRelevance({
      lessonBody,
      replyText: "Let's talk about quantum physics and rocket fuel instead.",
    });
    expect(score).toBeLessThan(0.8);
  });
});
