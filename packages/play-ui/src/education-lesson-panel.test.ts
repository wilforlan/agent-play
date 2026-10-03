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

  it("loads and sends Joe chat turns", async () => {
    const panel = createEducationLessonPanel({ parent });
    const onLoadJoeChat = vi.fn(async () => [
      {
        id: "s1",
        role: "student" as const,
        text: "How do I start?",
        createdAt: "2026-10-03T12:00:00.000Z",
      },
    ]);
    const onSendJoeMessage = vi.fn(async () => [
      {
        id: "s1",
        role: "student" as const,
        text: "How do I start?",
        createdAt: "2026-10-03T12:00:00.000Z",
      },
      {
        id: "j1",
        role: "joe" as const,
        text: "Contour first",
        createdAt: "2026-10-03T12:00:01.000Z",
        structured: {
          headline: "Contour first",
          blocks: [
            { kind: "concept" as const, body: "Use contour lines." },
            { kind: "probe" as const, body: "Which edge?" },
          ],
          nextMove: "Trace one rim.",
          relevance: 0.91,
        },
      },
    ]);
    panel.show({
      facultyLabel: "Faculty of Art",
      pathTitle: "Visual Arts Studio",
      lessonTitle: "Seeing Before Drawing",
      body: "Contour matters.",
      onLoadJoeChat,
      onSendJoeMessage,
    });
    await vi.waitFor(() => {
      expect(parent.textContent).toContain("How do I start?");
    });
    const input = parent.querySelector(
      `.preview-education-lesson__composer input`
    ) as HTMLInputElement;
    input.value = "What next?";
    const sendBtn = [...parent.querySelectorAll("button")].find(
      (btn) => btn.textContent === "SEND"
    ) as HTMLButtonElement;
    sendBtn.click();
    await vi.waitFor(() => {
      expect(onSendJoeMessage).toHaveBeenCalledWith("What next?");
      expect(parent.textContent).toContain("Contour first");
      expect(parent.textContent).toContain("NEXT // Trace one rim.");
    });
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
