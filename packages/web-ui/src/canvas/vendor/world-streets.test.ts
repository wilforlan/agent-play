import { describe, expect, it } from "vitest";
import { STREETS } from "./world-streets.js";

describe("STREETS registry", () => {
  it("lists exactly 21 named streets", () => {
    expect(STREETS.length).toBe(21);
    const ids = new Set(STREETS.map((s) => s.id));
    expect(ids.size).toBe(21);
  });
});
