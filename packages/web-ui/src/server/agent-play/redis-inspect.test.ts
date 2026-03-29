import { describe, expect, it } from "vitest";
import { truncateForInspection } from "./redis-inspect.js";

describe("truncateForInspection", () => {
  it("leaves short strings unchanged", () => {
    expect(truncateForInspection("abc", 10)).toBe("abc");
  });

  it("truncates long strings with ellipsis note", () => {
    const s = "x".repeat(100);
    const out = truncateForInspection(s, 20);
    expect(out.length).toBeLessThan(s.length);
    expect(out).toContain("truncated");
  });
});
