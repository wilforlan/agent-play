import { describe, expect, it } from "vitest";
import { STREETS, getStreetById } from "./world-streets.js";

describe("STREETS pool", () => {
  it("exposes twenty one canonical street ids", () => {
    expect(STREETS.length).toBe(21);
    const ids = new Set(STREETS.map((s) => s.id));
    expect(ids.size).toBe(21);
  });

  it("resolves pool entries by id", () => {
    expect(getStreetById("st-john")?.label).toContain("John");
  });
});
