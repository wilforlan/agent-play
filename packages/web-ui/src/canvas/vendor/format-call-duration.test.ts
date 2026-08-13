import { describe, expect, it } from "vitest";
import { formatCallDurationHhMmSs } from "./format-call-duration.js";

describe("formatCallDurationHhMmSs", () => {
  it("formats zero seconds", () => {
    expect(formatCallDurationHhMmSs(0)).toBe("00:00:00");
  });

  it("formats hours minutes and seconds", () => {
    expect(formatCallDurationHhMmSs(3661)).toBe("01:01:01");
  });

  it("floors fractional seconds and clamps negatives", () => {
    expect(formatCallDurationHhMmSs(1.9)).toBe("00:00:01");
    expect(formatCallDurationHhMmSs(-3)).toBe("00:00:00");
  });
});
