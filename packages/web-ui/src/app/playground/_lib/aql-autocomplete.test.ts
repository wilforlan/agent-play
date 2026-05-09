import { describe, expect, it } from "vitest";
import { applyAqlAutocomplete, getAqlAutocomplete } from "./aql-autocomplete";

describe("aql autocomplete", () => {
  it("suggests USE AGENT NODE for keyword prefix", () => {
    const source = "US";
    const result = getAqlAutocomplete({ source, cursor: source.length });
    expect(result.options.some((o) => o.label === "USE AGENT NODE")).toBe(true);
  });

  it("suggests let variables and agent fields", () => {
    const source = 'LET mainNode = "main-1"\nSHOW $ag';
    const result = getAqlAutocomplete({ source, cursor: source.length });
    expect(result.options.some((o) => o.label === "$agent.name")).toBe(true);
    expect(result.options.some((o) => o.label === "$mainNode")).toBe(false);
  });

  it("applies completion replacement at token range", () => {
    const source = "INS";
    const auto = getAqlAutocomplete({ source, cursor: source.length });
    const selected = auto.options.find((o) => o.label === "INSPECT MAIN NODE");
    expect(selected).toBeDefined();
    const applied = applyAqlAutocomplete({
      source,
      from: auto.from,
      to: auto.to,
      insertText: selected?.insertText ?? "",
    });
    expect(applied.source).toBe("INSPECT MAIN NODE");
    expect(applied.cursor).toBe("INSPECT MAIN NODE".length);
  });
});
