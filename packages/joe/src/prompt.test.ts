import { describe, expect, it } from "vitest";
import { buildJoeSystemPrompt } from "./prompt.js";

describe("buildJoeSystemPrompt", () => {
  it("grounds Joe in the lesson and requires high relevance", () => {
    const prompt = buildJoeSystemPrompt({
      facultyId: "faculty-art",
      pathId: "art-visual-studio",
      lessonId: "art-visual-studio/01-seeing-drawing",
      lessonTitle: "Seeing Before Drawing",
      lessonBody: "Contour and negative space matter.",
      pathTitle: "Visual Arts Studio",
      facultyLabel: "Faculty of Art",
    });
    expect(prompt).toContain("Joe");
    expect(prompt).toContain("Seeing Before Drawing");
    expect(prompt).toContain("Contour and negative space matter.");
    expect(prompt).toContain("0.8");
    expect(prompt).toContain("concept");
    expect(prompt).toContain("probe");
  });
});
