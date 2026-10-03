// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createEducationLessonPanel } from "./education-lesson-panel.js";

describe("education lesson panel", () => {
  let parent: HTMLElement;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  it("renders lesson markdown as HTML", () => {
    const panel = createEducationLessonPanel({ parent });
    panel.show({
      facultyLabel: "Faculty of Art",
      pathTitle: "Visual Arts Studio",
      lessonTitle: "Seeing Before Drawing",
      body: "## Why this lesson matters\n\nContour and **negative space**.",
    });
    const body = parent.querySelector(
      ".preview-education-lesson__body"
    ) as HTMLElement;
    expect(body.querySelector("h2")?.textContent).toBe(
      "Why this lesson matters"
    );
    expect(body.querySelector("strong")?.textContent).toBe("negative space");
    expect(body.textContent).not.toContain("## Why");
    panel.destroy();
  });

  it("marks a lesson complete without grading", async () => {
    const panel = createEducationLessonPanel({ parent });
    const onComplete = vi.fn(async () => undefined);
    panel.show({
      facultyLabel: "Faculty of Science",
      pathTitle: "Computer Modeling",
      lessonTitle: "Model Critique",
      body: "Check the assumptions.",
      onComplete,
    });
    expect(parent.textContent).toContain("Reflection (optional, not graded)");
    const reflection = parent.querySelector(
      ".preview-education-lesson__reflection"
    ) as HTMLTextAreaElement;
    reflection.value = "I will restate the claim.";
    const completeBtn = [...parent.querySelectorAll("button")].find(
      (btn) => btn.textContent === "Mark lesson complete"
    ) as HTMLButtonElement;
    completeBtn.click();
    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("I will restate the claim.");
    });
    expect(panel.isOpen()).toBe(false);
    panel.destroy();
  });
});
