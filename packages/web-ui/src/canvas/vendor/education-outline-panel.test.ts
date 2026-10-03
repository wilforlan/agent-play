// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createEducationOutlinePanel } from "./education-outline-panel.js";

describe("education outline panel", () => {
  let parent: HTMLElement;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  it("shows path progress and selected lesson", () => {
    const panel = createEducationOutlinePanel({ parent });
    panel.show({
      pathTitle: "Computer Modeling",
      selectedLessonId: "b",
      lessons: [
        { lessonId: "a", title: "Models", order: 1, complete: true },
        { lessonId: "b", title: "Critique", order: 2, complete: false },
      ],
    });
    expect(parent.textContent).toContain("Computer Modeling");
    expect(parent.textContent).toContain("1 / 2 lessons complete");
    expect(parent.textContent).toContain("[x]");
    expect(parent.textContent).toContain("[ ]");
    expect(parent.textContent).toContain("2. Critique");
    const selected = parent.querySelector(
      ".preview-education-outline__item--selected"
    );
    expect(selected?.textContent).toContain("Critique");
    panel.hide();
    expect(
      (parent.querySelector(".preview-education-outline") as HTMLElement).hidden
    ).toBe(true);
    panel.destroy();
  });
});
