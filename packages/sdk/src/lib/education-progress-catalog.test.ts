import { describe, expect, it } from "vitest";
import {
  educationProgressKey,
  resolveEducationPathProgress,
} from "./education-progress-catalog.js";

describe("education progress catalog", () => {
  it("builds stable progress keys", () => {
    expect(
      educationProgressKey({
        facultyId: "faculty-science",
        pathId: "sci-computer-modeling",
        lessonId: "05-model-critique",
      })
    ).toBe("faculty-science:sci-computer-modeling:05-model-critique");
  });

  it("computes path completion ratio", () => {
    const progress = resolveEducationPathProgress({
      lessonIds: ["a", "b", "c", "d"],
      completedLessonIds: new Set(["a", "c"]),
    });
    expect(progress.completedCount).toBe(2);
    expect(progress.totalCount).toBe(4);
    expect(progress.ratio).toBe(0.5);
    expect(progress.statuses.map((row) => row.complete)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });
});
