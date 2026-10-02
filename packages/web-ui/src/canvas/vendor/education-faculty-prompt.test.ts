import { describe, expect, it } from "vitest";
import { resolveFacultyProximityActions } from "./education-faculty-prompt.js";

describe("faculty proximity actions", () => {
  it("blocks P/A/C without a day pass", () => {
    const actions = resolveFacultyProximityActions({
      hasDayPass: false,
      hasEnrollment: false,
      facultyLabel: "Faculty of Science",
    });
    expect(actions.canEnter).toBe(false);
    expect(actions.canChoosePath).toBe(false);
    expect(actions.canStartClass).toBe(false);
  });

  it("enables enter and path choice after day gate", () => {
    const actions = resolveFacultyProximityActions({
      hasDayPass: true,
      hasEnrollment: false,
      facultyLabel: "Faculty of Art",
    });
    expect(actions.canEnter).toBe(true);
    expect(actions.canChoosePath).toBe(true);
    expect(actions.canStartClass).toBe(false);
    expect(actions.legend).toContain("P: enter");
    expect(actions.legend).toContain("A: choose path");
  });

  it("enables start class once enrolled", () => {
    const actions = resolveFacultyProximityActions({
      hasDayPass: true,
      hasEnrollment: true,
      facultyLabel: "Faculty of Medicine",
    });
    expect(actions.canStartClass).toBe(true);
    expect(actions.prompt).toContain("C: start class");
  });
});
