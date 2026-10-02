import { describe, expect, it } from "vitest";
import { loadEducationLessonBody } from "./lesson-loader.js";

describe("education lesson loader", () => {
  it("loads packed markdown without import.meta.glob", () => {
    const body = loadEducationLessonBody(
      "faculties/science/sci-computer-modeling/lessons/05-model-critique.md"
    );
    expect(body).toContain("Model Critique");
    expect(body).toContain("Senior High");
  });
});
